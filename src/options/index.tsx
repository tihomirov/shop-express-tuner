import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createEmptyRecipe } from "../recipe/normalize";
import { ExtractResult, Recipe } from "../recipe/types";
import { RecipeService } from "../services/recipe-service";
import { RecipeEditor } from "./components/recipe-editor";

const downloadJson = (name: string, data: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const Options = () => {
  const [recipes, setRecipes] = useState<Recipe[] | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  // The recipe being edited; saved with the Save button
  const [draft, setDraft] = useState<Recipe | undefined>();
  const [lastResult, setLastResult] = useState<ExtractResult | undefined>();
  const [status, setStatus] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const showStatus = (text: string, durationMs = 2000) => {
    setStatus(text);
    setTimeout(() => setStatus(""), durationMs);
  };

  useEffect(() => {
    RecipeService.list().then(loaded => {
      setRecipes(loaded);
      setSelectedId(loaded[0]?.id);
    });
    // Recipes are also changed by the field picker on a page
    return RecipeService.subscribe(setRecipes);
  }, []);

  const saved = recipes?.find(({ id }) => id === selectedId);
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    setDraft(saved);
    setLastResult(undefined);
    if (selectedId) {
      RecipeService.getLastResult(selectedId).then(setLastResult);
    }
    // Only a different recipe resets the draft, not a re-save of the same one
  }, [selectedId]);

  const confirmDiscard = () => !dirty || confirm("Discard the unsaved changes?");

  const select = (id: string) => {
    if (id !== selectedId && confirmDiscard()) {
      setSelectedId(id);
    }
  };

  const save = async () => {
    if (!draft) {
      return;
    }
    try {
      await RecipeService.save(draft);
      showStatus("Saved.");
    } catch (e) {
      showStatus(`Could not save: ${e instanceof Error ? e.message : String(e)}`, 5000);
    }
  };

  const create = async () => {
    if (!confirmDiscard()) {
      return;
    }
    const recipe = createEmptyRecipe('New recipe', ['*']);
    await RecipeService.save(recipe);
    setSelectedId(recipe.id);
  };

  const remove = async () => {
    if (!saved || !confirm(`Delete the recipe "${saved.name}"?`)) {
      return;
    }
    const rest = (recipes ?? []).filter(({ id }) => id !== saved.id);
    await RecipeService.saveAll(rest);
    setSelectedId(rest[0]?.id);
  };

  const duplicate = async () => {
    if (!draft || !confirmDiscard()) {
      return;
    }
    const copy = { ...draft, id: crypto.randomUUID(), name: `${draft.name} (copy)` };
    await RecipeService.save(copy);
    setSelectedId(copy.id);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const imported = RecipeService.parseImport(await file.text());
      const existing = recipes ?? [];
      const replaced = imported.filter(recipe => existing.some(({ id }) => id === recipe.id));
      if (replaced.length > 0 && !confirm(`Replace ${replaced.map(({ name }) => `"${name}"`).join(', ')} with the imported version?`)) {
        return;
      }
      const merged = [...existing.filter(({ id }) => !imported.some(recipe => recipe.id === id)), ...imported];
      await RecipeService.saveAll(merged);
      setSelectedId(imported[0].id);
      showStatus(`Imported ${imported.length} recipe(s).`);
    } catch (e) {
      showStatus(`Could not import: ${e instanceof Error ? e.message : String(e)}`, 5000);
    }
  };

  const recipeList = useMemo(() => recipes ?? [], [recipes]);

  if (!recipes) {
    return null;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginTop: 0 }}>OLa recipes</h1>
      <p style={{ color: '#555' }}>
        A recipe tells the extension what to read on a site and what to show: messages, tables and buttons.
        To pick fields, open the page, click the extension icon and press "Pick fields".
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        <select value={selectedId ?? ''} onChange={e => select(e.target.value)}>
          {recipeList.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
        <button onClick={create}>New</button>
        <button onClick={duplicate} disabled={!draft}>Duplicate</button>
        <button onClick={remove} disabled={!saved}>Delete</button>
        <button onClick={() => saved && downloadJson(`${saved.name}.json`, saved)} disabled={!saved}>Export</button>
        <button onClick={() => downloadJson('ola-recipes.json', recipeList)}>Export all</button>
        <button onClick={() => fileInput.current?.click()}>Import…</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={e => {
            importFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {draft ? (
        <RecipeEditor recipe={draft} onChange={setDraft} lastResult={lastResult} />
      ) : (
        <p>No recipes yet. Create one with "New".</p>
      )}

      {draft && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          padding: '8px 0',
          background: '#fff',
          borderTop: '1px solid #ddd',
        }}>
          <button onClick={save} disabled={!dirty}>Save</button>
          <button onClick={() => setDraft(saved)} disabled={!dirty}>Revert</button>
          <span>{dirty ? "Unsaved changes" : ""}</span>
          <span>{status}</span>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
