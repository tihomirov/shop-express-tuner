import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from 'webextension-polyfill';
import { TabMessageEvent } from '../common/tab-message';
import { OutputsView } from '../components/outputs-view';
import { TableModel } from '../recipe/outputs';
import { findRecipes, suggestMatchPattern } from '../recipe/matching';
import { createEmptyRecipe } from '../recipe/normalize';
import { ExtractResult, Recipe, TableOutput } from '../recipe/types';
import { RecipeService } from '../services/recipe-service';
import { BrowserTab, TabsService } from '../services/tabs-service';
import { TabList } from './components/tab-list';

// Pages like chrome:// or tabs opened before the extension was installed have no content script
const NO_CONTENT_SCRIPT_HINT = 'Reload the tab and try again.';

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const Popup = () => {
  const [recipes, setRecipes] = useState<Recipe[] | undefined>();
  const [currentTab, setCurrentTab] = useState<BrowserTab | undefined>();
  const [recipeId, setRecipeId] = useState<string | undefined>();
  const [result, setResult] = useState<ExtractResult | undefined>();
  const [allTabs, setAllTabs] = useState<BrowserTab[] | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    RecipeService.list().then(setRecipes);
    TabsService.getCurrentTab().then(setCurrentTab);
    TabsService.getAllTabs().then(tabs => setAllTabs(tabs.filter(tab => tab.title)));
  }, []);

  const matching = useMemo(
    () => (recipes && currentTab?.url ? findRecipes(recipes, currentTab.url) : []),
    [recipes, currentTab],
  );
  const recipe = matching.find(({ id }) => id === recipeId) ?? matching[0];

  useEffect(() => {
    setResult(undefined);
    if (!recipe) {
      return;
    }

    let active = true;
    TabsService.sendMessageToCurrentTab({ event: TabMessageEvent.ExtractRecipe, recipe })
      .then(extracted => {
        if (active) {
          setError(undefined);
          setResult(extracted);
          RecipeService.saveLastResult(recipe.id, extracted);
        }
      })
      .catch(e => active && setError(`Could not read this page: ${getErrorMessage(e)}. ${NO_CONTENT_SCRIPT_HINT}`));

    return () => {
      active = false;
    };
  }, [recipe]);

  const startPicker = useCallback(async (id: string) => {
    try {
      await TabsService.sendMessageToCurrentTab({ event: TabMessageEvent.StartPicker, recipeId: id });
      window.close();
    } catch (e) {
      setError(`Could not start the picker: ${getErrorMessage(e)}. ${NO_CONTENT_SCRIPT_HINT}`);
    }
  }, []);

  const createRecipe = useCallback(async () => {
    if (!currentTab?.url) {
      return;
    }
    const name = new URL(currentTab.url).hostname || 'New recipe';
    const created = createEmptyRecipe(name, [suggestMatchPattern(currentTab.url)]);
    await RecipeService.save(created);
    await startPicker(created.id);
  }, [currentTab, startPicker]);

  const pinTable = useCallback(async (tab: BrowserTab, title: string, table: TableModel, switchToTab: boolean) => {
    if (tab.id === undefined) {
      return;
    }

    try {
      await TabsService.sendMessageToTab(tab.id, { event: TabMessageEvent.PinTable, title, table });
      setError(undefined);
    } catch (e) {
      setError(`Could not open the table in "${tab.title}". ${NO_CONTENT_SCRIPT_HINT}`);
      return;
    }

    if (switchToTab) {
      await TabsService.goToTab(tab);
    }
  }, []);

  const renderTableExtras = useCallback(
    (output: TableOutput, table: TableModel) =>
      allTabs && <TabList tabs={allTabs} onPick={(tab, switchToTab) => pinTable(tab, output.title, table, switchToTab)} />,
    [allTabs, pinTable],
  );

  return (
    <div style={{ width: '600px', fontSize: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        {matching.length > 1 ? (
          <select value={recipe?.id} onChange={e => setRecipeId(e.target.value)}>
            {matching.map(({ id, name }) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        ) : (
          <strong>{recipe?.name ?? ''}</strong>
        )}
        <div style={{ display: 'flex', gap: '6px' }}>
          {recipe && <button title="Pick the elements to read on this page" onClick={() => startPicker(recipe.id)}>🎯 Pick fields</button>}
          <button title="Settings" onClick={() => browser.runtime.openOptionsPage()}>⚙️ Settings</button>
        </div>
      </div>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}

      {recipes && !recipe && (
        <div style={{ margin: '12px 0' }}>
          <p>No recipe is set up for this page.</p>
          <button onClick={createRecipe} disabled={!currentTab?.url}>Create a recipe for this page</button>
        </div>
      )}

      {recipe && result && (
        <>
          {result.missing.length > 0 && (
            <p style={{ color: '#9a5b00' }}>Not found on the page: {result.missing.join(', ')}</p>
          )}
          <OutputsView recipe={recipe} result={result} renderTableExtras={renderTableExtras} />
          <details style={{ marginTop: '12px' }}>
            <summary>Read values</summary>
            <ValuesTable result={result} />
          </details>
        </>
      )}
    </div>
  );
};

const ValuesTable = ({ result }: { result: ExtractResult }) => (
  <table style={{ fontSize: '11px' }}>
    <tbody>
      {Object.entries(result.values).map(([key, value]) => (
        <tr key={key}><td><b>{key}</b></td><td>{value}</td></tr>
      ))}
      {Object.entries(result.collections).map(([key, rows]) => (
        <tr key={key}>
          <td><b>{key}</b></td>
          <td>{rows.map((row, index) => <div key={index}>{JSON.stringify(row)}</div>)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
