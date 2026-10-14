import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { describeCandidate, suggestKey, validateKey } from '../../recipe/describe';
import { extractRecipe } from '../../recipe/extract';
import { readElement, resolveCandidate, resolveLocator, resolveLocatorAll, Root } from '../../recipe/locator';
import { applyPipeline, validateExpression } from '../../recipe/template';
import { generateLocators, generateRowSelectors, RowCandidate } from '../../recipe/selector-generator';
import {
  Collection,
  EXTRACT_MODES,
  ExtractMode,
  Field,
  LocatorCandidate,
  Recipe,
} from '../../recipe/types';
import { RecipeService } from '../../services/recipe-service';
import { Highlight } from './highlight';
import { usePagePicker } from './use-page-picker';

// Purpose of a pick: a field of the record, a field of a list (relative to its first row) or the rows of a list
type Purpose =
  | Readonly<{ kind: 'field'; collectionKey?: string; replaceKey?: string }>
  | Readonly<{ kind: 'row'; replaceKey?: string }>;

type FieldDraft = Readonly<{
  purpose: Extract<Purpose, { kind: 'field' }>;
  element: Element;
  key: string;
  extract: ExtractMode;
  attr: string;
  pipeline: string;
  candidates: ReadonlyArray<LocatorCandidate>;
  chosen: number;
}>;

type RowDraft = Readonly<{
  purpose: Extract<Purpose, { kind: 'row' }>;
  element: Element;
  key: string;
  candidates: ReadonlyArray<RowCandidate>;
  chosen: number;
  fields: Collection['fields'];
  computed: Collection['computed'];
}>;

type View =
  | Readonly<{ type: 'list' }>
  | Readonly<{ type: 'pick'; purpose: Purpose; message?: string }>
  | Readonly<{ type: 'field'; draft: FieldDraft }>
  | Readonly<{ type: 'row'; draft: RowDraft }>;

const COLORS = { hover: '#e8710a', picked: '#1a73e8', rows: '#188038' };
const MAX_FALLBACKS = 3;

const ui = {
  panel: {
    position: 'fixed',
    top: 8,
    width: 360,
    maxHeight: 'calc(100vh - 16px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
    padding: 10,
    background: '#fff',
    color: '#202124',
    font: '12px/1.4 Arial, sans-serif',
    border: '1px solid #bbb',
    borderRadius: 6,
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
    zIndex: 2147483647,
  } as React.CSSProperties,
  row: { display: 'flex', gap: 6, alignItems: 'center' } as React.CSSProperties,
  column: { display: 'flex', flexDirection: 'column', gap: 6 } as React.CSSProperties,
  muted: { color: '#666' } as React.CSSProperties,
  error: { color: '#b00020' } as React.CSSProperties,
  value: {
    padding: '4px 6px',
    background: '#f1f3f4',
    borderRadius: 4,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  } as React.CSSProperties,
  heading: { margin: '8px 0 4px', fontSize: 12, textTransform: 'uppercase', color: '#666' } as React.CSSProperties,
};

const isFormControl = (element: Element) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);

// Names that a new field must not take: they share one namespace in templates
function takenKeys(recipe: Recipe, collectionKey: string | undefined, replaceKey: string | undefined): string[] {
  const own = collectionKey ? recipe.collections.find(({ key }) => key === collectionKey) : undefined;
  const keys = [
    'today',
    'message',
    ...Object.keys(recipe.constants),
    ...recipe.fields.map(({ key }) => key),
    ...recipe.computed.map(({ key }) => key),
    ...recipe.collections.map(({ key }) => key),
    ...(own ? [...own.fields, ...own.computed].map(({ key }) => key) : []),
  ];
  return keys.filter(key => key !== replaceKey);
}

const firstRow = (collection: Collection): Element | undefined => resolveLocatorAll(document, collection.rowLocator).elements[0];

const labelOf = (candidates: ReadonlyArray<LocatorCandidate>) => {
  const label = candidates.find(candidate => candidate.kind === 'label');
  return label?.kind === 'label' ? label.label : undefined;
};

type PickerProps = Readonly<{
  recipeId: string;
  host: HTMLElement;
  onClose: () => void;
}>;

export const Picker: FC<PickerProps> = ({ recipeId, host, onClose }) => {
  const [recipe, setRecipe] = useState<Recipe | undefined>();
  const [view, setView] = useState<View>({ type: 'list' });
  const [side, setSide] = useState<'left' | 'right'>('right');
  const [listHover, setListHover] = useState<Element | null>(null);
  // Where "child" goes after "parent": the path the user came up from
  const descent = useRef<Element[]>([]);

  useEffect(() => {
    RecipeService.get(recipeId).then(setRecipe);
  }, [recipeId]);

  const commit = useCallback((next: Recipe) => {
    setRecipe(next);
    return RecipeService.save(next);
  }, []);

  const result = useMemo(() => (recipe ? extractRecipe(recipe, document) : undefined), [recipe]);
  const env = useMemo(() => ({ tables: recipe?.tables ?? [] }), [recipe]);

  const rootFor = useCallback(
    (collectionKey?: string): Root | undefined => {
      if (!collectionKey) {
        return document;
      }
      const collection = recipe?.collections.find(({ key }) => key === collectionKey);
      return collection && firstRow(collection);
    },
    [recipe],
  );

  const makeFieldDraft = useCallback(
    (purpose: FieldDraft['purpose'], element: Element, previous?: Partial<FieldDraft>): FieldDraft | string => {
      const root = rootFor(purpose.collectionKey);
      if (!root || !recipe) {
        return 'This list has no rows on the page yet.';
      }
      if (root !== document && !root.contains(element)) {
        return 'Pick an element inside the first row of the list.';
      }

      const extract = previous?.extract ?? (isFormControl(element) ? 'value' : 'text');
      const generated = generateLocators(element, root, { mode: extract });
      const candidates = previous?.candidates
        ? [...previous.candidates, ...generated.filter(item => !previous.candidates!.some(old => JSON.stringify(old) === JSON.stringify(item)))]
        : generated;
      const key =
        previous?.key ?? suggestKey(labelOf(generated), takenKeys(recipe, purpose.collectionKey, purpose.replaceKey));

      return {
        purpose,
        element,
        key,
        extract,
        attr: previous?.attr ?? '',
        pipeline: previous?.pipeline ?? '',
        candidates,
        chosen: 0,
      };
    },
    [recipe, rootFor],
  );

  const onPicked = useCallback(
    (element: Element, purpose: Purpose) => {
      descent.current = [];
      if (!recipe) {
        return;
      }

      if (purpose.kind === 'row') {
        const candidates = generateRowSelectors(element, document);
        const taken = [...recipe.collections.map(({ key }) => key), ...takenKeys(recipe, undefined, undefined)];
        const existing = recipe.collections.find(({ key }) => key === purpose.replaceKey);
        setView({
          type: 'row',
          draft: {
            purpose,
            element,
            key: purpose.replaceKey ?? suggestKey('items', taken),
            candidates,
            chosen: 0,
            fields: existing?.fields ?? [],
            computed: existing?.computed ?? [],
          },
        });
        return;
      }

      const draft = makeFieldDraft(purpose, element);
      setView(typeof draft === 'string' ? { type: 'pick', purpose, message: draft } : { type: 'field', draft });
    },
    [recipe, makeFieldDraft],
  );

  const picking = view.type === 'pick';
  const hovered = usePagePicker({
    active: picking,
    host,
    onPick: element => view.type === 'pick' && onPicked(element, view.purpose),
    onCancel: () => setView({ type: 'list' }),
  });

  if (!recipe || !result) {
    return null;
  }

  const startPick = (purpose: Purpose) => setView({ type: 'pick', purpose });

  const editField = (field: Field, collectionKey?: string) => {
    const root = rootFor(collectionKey);
    const element = root && resolveLocator(root, field.locator);
    const purpose = { kind: 'field', collectionKey, replaceKey: field.key } as const;
    if (!element) {
      startPick(purpose);
      return;
    }
    const draft = makeFieldDraft(purpose, element, {
      key: field.key,
      extract: field.extract,
      attr: field.attr ?? '',
      pipeline: field.pipeline ?? '',
      candidates: field.locator,
    });
    setView(typeof draft === 'string' ? { type: 'pick', purpose, message: draft } : { type: 'field', draft });
  };

  const removeField = (key: string, collectionKey?: string) =>
    commit({
      ...recipe,
      fields: collectionKey ? recipe.fields : recipe.fields.filter(field => field.key !== key),
      collections: recipe.collections.map(collection =>
        collection.key === collectionKey
          ? { ...collection, fields: collection.fields.filter(field => field.key !== key) }
          : collection,
      ),
    });

  const removeCollection = (key: string) =>
    commit({ ...recipe, collections: recipe.collections.filter(collection => collection.key !== key) });

  const panelSide = side === 'right' ? { right: 8 } : { left: 8 };

  return (
    <>
      {view.type === 'pick' && <Highlight element={hovered} color={COLORS.hover} />}
      {view.type === 'list' && <Highlight element={listHover} color={COLORS.picked} />}
      {view.type === 'field' && <Highlight element={view.draft.element} color={COLORS.picked} />}
      {view.type === 'row' && <RowHighlights draft={view.draft} />}

      <div style={{ ...ui.panel, ...panelSide }}>
        <div style={{ ...ui.row, justifyContent: 'space-between' }}>
          <strong>🎯 {recipe.name}</strong>
          <span style={ui.row}>
            <button title="Move the panel to the other side" onClick={() => setSide(side === 'right' ? 'left' : 'right')}>⇄</button>
            <button title="Close the picker" onClick={onClose}>✕</button>
          </span>
        </div>

        {view.type === 'list' && (
          <ListView
            recipe={recipe}
            result={result}
            onHover={setListHover}
            rootFor={rootFor}
            onAddField={collectionKey => startPick({ kind: 'field', collectionKey })}
            onAddList={() => startPick({ kind: 'row' })}
            onEditField={editField}
            onEditList={key => startPick({ kind: 'row', replaceKey: key })}
            onRemoveField={removeField}
            onRemoveList={removeCollection}
            onDone={onClose}
          />
        )}

        {view.type === 'pick' && (
          <div style={ui.column}>
            <p style={{ margin: '8px 0 0' }}>
              {view.purpose.kind === 'row'
                ? 'Click one repeating row of the list (for example one order item), the whole row, not a cell in it.'
                : view.purpose.collectionKey
                  ? `Click the value inside the first row of "${view.purpose.collectionKey}".`
                  : 'Click the value you want to read on the page.'}
            </p>
            {view.message && <div style={ui.error}>{view.message}</div>}
            <div style={ui.muted}>Esc to cancel</div>
            <button onClick={() => setView({ type: 'list' })}>Cancel</button>
          </div>
        )}

        {view.type === 'field' && (
          <FieldEditor
            draft={view.draft}
            recipe={recipe}
            rootFor={rootFor}
            valuesContext={result.values}
            env={env}
            descent={descent}
            onChange={draft => setView({ type: 'field', draft })}
            onRepick={() => startPick(view.draft.purpose)}
            onCancel={() => setView({ type: 'list' })}
            onSave={async (field, purpose) => {
              const next = saveField(recipe, field, purpose);
              await commit(next);
              setView({ type: 'list' });
            }}
            makeDraft={makeFieldDraft}
          />
        )}

        {view.type === 'row' && (
          <RowEditor
            draft={view.draft}
            recipe={recipe}
            onChange={draft => setView({ type: 'row', draft })}
            onRepick={() => startPick(view.draft.purpose)}
            onCancel={() => setView({ type: 'list' })}
            onSave={async collection => {
              await commit(saveCollection(recipe, collection, view.draft.purpose.replaceKey));
              setView({ type: 'list' });
            }}
          />
        )}
      </div>
    </>
  );
};

function saveField(recipe: Recipe, field: Field, purpose: FieldDraft['purpose']): Recipe {
  const upsert = (fields: ReadonlyArray<Field>) =>
    purpose.replaceKey && fields.some(({ key }) => key === purpose.replaceKey)
      ? fields.map(item => (item.key === purpose.replaceKey ? field : item))
      : [...fields, field];

  if (!purpose.collectionKey) {
    return { ...recipe, fields: upsert(recipe.fields) };
  }
  return {
    ...recipe,
    collections: recipe.collections.map(collection =>
      collection.key === purpose.collectionKey ? { ...collection, fields: upsert(collection.fields) } : collection,
    ),
  };
}

function saveCollection(recipe: Recipe, collection: Collection, replaceKey: string | undefined): Recipe {
  const exists = replaceKey && recipe.collections.some(({ key }) => key === replaceKey);
  return {
    ...recipe,
    collections: exists
      ? recipe.collections.map(item => (item.key === replaceKey ? collection : item))
      : [...recipe.collections, collection],
  };
}

const RowHighlights: FC<{ draft: RowDraft }> = ({ draft }) => {
  const candidate = draft.candidates[draft.chosen]?.candidate;
  const rows = candidate ? resolveCandidate(document, candidate).slice(0, 30) : [];

  return (
    <>
      {rows.map((row, index) => (
        <Highlight key={index} element={row} color={row === draft.element ? COLORS.picked : COLORS.rows} label={false} />
      ))}
    </>
  );
};

type ListViewProps = Readonly<{
  recipe: Recipe;
  result: ReturnType<typeof extractRecipe>;
  rootFor: (collectionKey?: string) => Root | undefined;
  onHover: (element: Element | null) => void;
  onAddField: (collectionKey?: string) => void;
  onAddList: () => void;
  onEditField: (field: Field, collectionKey?: string) => void;
  onEditList: (key: string) => void;
  onRemoveField: (key: string, collectionKey?: string) => void;
  onRemoveList: (key: string) => void;
  onDone: () => void;
}>;

const ListView: FC<ListViewProps> = ({
  recipe,
  result,
  rootFor,
  onHover,
  onAddField,
  onAddList,
  onEditField,
  onEditList,
  onRemoveField,
  onRemoveList,
  onDone,
}) => {
  const fieldRow = (field: Field, value: string | undefined, collectionKey?: string) => {
    const missing = result.missing.includes(collectionKey ? `${collectionKey}.${field.key}` : field.key);
    return (
      <div
        key={field.key}
        style={{ ...ui.row, justifyContent: 'space-between', padding: '2px 0' }}
        onMouseEnter={() => {
          const root = rootFor(collectionKey);
          onHover((root && resolveLocator(root, field.locator)) || null);
        }}
        onMouseLeave={() => onHover(null)}
      >
        <span style={{ minWidth: 0, flex: 1 }}>
          <b>{field.key}</b>{' '}
          {missing ? <span style={ui.error}>not found on the page</span> : <span style={ui.muted}>{value}</span>}
        </span>
        <button title="Edit" onClick={() => onEditField(field, collectionKey)}>✎</button>
        <button title="Delete" onClick={() => onRemoveField(field.key, collectionKey)}>🗑</button>
      </div>
    );
  };

  return (
    <div>
      <h4 style={ui.heading}>Fields</h4>
      {recipe.fields.length === 0 && <div style={ui.muted}>Nothing is read from this page yet.</div>}
      {recipe.fields.map(field => fieldRow(field, result.values[field.key]))}
      <button style={{ marginTop: 4 }} onClick={() => onAddField()}>+ Add field</button>

      <h4 style={ui.heading}>Lists (repeating rows)</h4>
      {recipe.collections.map(collection => {
        const rows = result.collections[collection.key] ?? [];
        return (
          <div key={collection.key} style={{ borderLeft: '3px solid #ddd', paddingLeft: 6, marginBottom: 6 }}>
            <div style={{ ...ui.row, justifyContent: 'space-between' }}>
              <span>
                <b>{collection.key}</b> <span style={ui.muted}>{rows.length} rows found</span>
              </span>
              <button title="Pick the rows again" onClick={() => onEditList(collection.key)}>✎</button>
              <button title="Delete the list" onClick={() => onRemoveList(collection.key)}>🗑</button>
            </div>
            {collection.fields.map(field => fieldRow(field, rows[0]?.[field.key], collection.key))}
            <button disabled={rows.length === 0} onClick={() => onAddField(collection.key)}>+ Add field to list</button>
          </div>
        );
      })}
      <button onClick={onAddList}>+ Add list</button>

      <p style={{ ...ui.muted, margin: '10px 0 6px' }}>
        Fields are saved right away. Messages, tables and buttons are edited in the extension settings.
      </p>
      <button onClick={onDone}>Done</button>
    </div>
  );
};

type FieldEditorProps = Readonly<{
  draft: FieldDraft;
  recipe: Recipe;
  rootFor: (collectionKey?: string) => Root | undefined;
  valuesContext: Readonly<Record<string, string>>;
  env: { tables: Recipe['tables'] };
  descent: React.MutableRefObject<Element[]>;
  makeDraft: (purpose: FieldDraft['purpose'], element: Element, previous?: Partial<FieldDraft>) => FieldDraft | string;
  onChange: (draft: FieldDraft) => void;
  onRepick: () => void;
  onCancel: () => void;
  onSave: (field: Field, purpose: FieldDraft['purpose']) => void;
}>;

const FieldEditor: FC<FieldEditorProps> = ({
  draft,
  recipe,
  rootFor,
  valuesContext,
  env,
  descent,
  makeDraft,
  onChange,
  onRepick,
  onCancel,
  onSave,
}) => {
  const root = rootFor(draft.purpose.collectionKey) ?? document;
  const candidate = draft.candidates[draft.chosen];
  const found = candidate ? resolveCandidate(root, candidate)[0] : undefined;
  const raw = found ? readElement(found, draft.extract, draft.attr) : undefined;
  const pipelineError = draft.pipeline ? validateExpression(draft.pipeline, 'pipeline') : undefined;
  const evaluated =
    raw !== undefined && draft.pipeline && !pipelineError ? applyPipeline(raw, draft.pipeline, valuesContext, env) : undefined;
  const value = evaluated ? evaluated.text : raw;
  const keyError = validateKey(draft.key, takenKeys(recipe, draft.purpose.collectionKey, draft.purpose.replaceKey));
  const modeError = draft.extract === 'attr' && !draft.attr ? 'Enter the attribute name.' : undefined;
  const canSave = !keyError && !pipelineError && !modeError && candidate !== undefined && raw !== undefined;

  // Moves the selection to another element, keeping what the user has typed
  const moveTo = (element: Element | null | undefined, climbing?: Element) => {
    if (!element || element === document.documentElement || (root !== document && element === root)) {
      return;
    }
    const next = makeDraft(draft.purpose, element, { ...draft, candidates: undefined, chosen: 0 });
    if (typeof next === 'string') {
      return;
    }
    if (climbing) {
      descent.current.push(climbing);
    }
    onChange(next);
  };

  const goChild = () => {
    const remembered = descent.current.pop();
    const children = [...draft.element.children];
    moveTo(remembered && draft.element.contains(remembered) ? remembered : children.find(child => child.textContent?.trim()) ?? children[0]);
  };

  const change = (patch: Partial<FieldDraft>) => {
    const next = { ...draft, ...patch };
    // The candidates depend on the way the value is read (an input's value is not its text)
    if (patch.extract && patch.extract !== draft.extract) {
      const regenerated = makeDraft(draft.purpose, draft.element, { ...next, candidates: undefined });
      onChange(typeof regenerated === 'string' ? next : regenerated);
    } else {
      onChange(next);
    }
  };

  const save = () => {
    const locator = [candidate, ...draft.candidates.filter((_, index) => index !== draft.chosen)]
      .filter(item => resolveCandidate(root, item).length > 0)
      .slice(0, MAX_FALLBACKS);
    onSave(
      {
        key: draft.key,
        locator,
        extract: draft.extract,
        attr: draft.extract === 'attr' ? draft.attr : undefined,
        pipeline: draft.pipeline || undefined,
        sample: value,
      },
      draft.purpose,
    );
  };

  return (
    <div style={{ ...ui.column, marginTop: 8 }}>
      <div style={ui.row}>
        <button onClick={onRepick}>🎯 Pick again</button>
        <span style={ui.muted}>or adjust the selection:</span>
      </div>
      <div style={ui.row}>
        <button title="Parent element" onClick={() => moveTo(draft.element.parentElement, draft.element)}>↑ Parent</button>
        <button title="First child element" onClick={goChild}>↓ Child</button>
        <button title="Previous sibling" onClick={() => moveTo(draft.element.previousElementSibling)}>←</button>
        <button title="Next sibling" onClick={() => moveTo(draft.element.nextElementSibling)}>→</button>
      </div>

      <label style={ui.column}>
        Name
        <input value={draft.key} onChange={e => change({ key: e.target.value })} />
      </label>
      {keyError && <div style={ui.error}>{keyError}</div>}

      <label style={ui.column}>
        Read
        <span style={ui.row}>
          <select value={draft.extract} onChange={e => change({ extract: e.target.value as ExtractMode })}>
            {EXTRACT_MODES.map(mode => (
              <option key={mode} value={mode}>
                {{ text: 'text', value: 'input value', attr: 'attribute', ownText: 'own text only', html: 'html' }[mode]}
              </option>
            ))}
          </select>
          {draft.extract === 'attr' && (
            <input placeholder="attribute, e.g. href" value={draft.attr} onChange={e => change({ attr: e.target.value })} />
          )}
        </span>
      </label>
      {modeError && <div style={ui.error}>{modeError}</div>}

      <label style={ui.column}>
        Find by
        <select value={draft.chosen} onChange={e => change({ chosen: Number(e.target.value) })}>
          {draft.candidates.map((item, index) => (
            <option key={index} value={index} title={describeCandidate(item)}>
              {describeCandidate(item)}
            </option>
          ))}
        </select>
      </label>

      <label style={ui.column}>
        Transform (optional)
        <input
          placeholder='e.g. split(",", 1) | trim'
          value={draft.pipeline}
          onChange={e => change({ pipeline: e.target.value })}
        />
      </label>
      {pipelineError && <div style={ui.error}>{pipelineError}</div>}
      {evaluated?.errors.map(error => <div key={error} style={ui.error}>{error}</div>)}

      <div>
        <div style={ui.muted}>Value</div>
        <div style={ui.value}>{value === undefined ? '(not found)' : value === '' ? '(empty)' : value}</div>
        {draft.pipeline && raw !== undefined && <div style={{ ...ui.muted, marginTop: 2 }}>Before the transform: {raw}</div>}
      </div>

      <div style={ui.row}>
        <button disabled={!canSave} onClick={save}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

type RowEditorProps = Readonly<{
  draft: RowDraft;
  recipe: Recipe;
  onChange: (draft: RowDraft) => void;
  onRepick: () => void;
  onCancel: () => void;
  onSave: (collection: Collection) => void;
}>;

const RowEditor: FC<RowEditorProps> = ({ draft, recipe, onChange, onRepick, onCancel, onSave }) => {
  const taken = [
    ...recipe.collections.map(({ key }) => key),
    ...takenKeys(recipe, undefined, undefined),
  ].filter(key => key !== draft.purpose.replaceKey);
  const keyError = validateKey(draft.key, taken);
  const chosen = draft.candidates[draft.chosen];

  const moveTo = (element: Element | null) => {
    if (element && element !== document.documentElement && element !== document.body) {
      onChange({ ...draft, element, candidates: generateRowSelectors(element, document), chosen: 0 });
    }
  };

  return (
    <div style={{ ...ui.column, marginTop: 8 }}>
      <div style={ui.row}>
        <button onClick={onRepick}>🎯 Pick again</button>
        <button title="Parent element" onClick={() => moveTo(draft.element.parentElement)}>↑ Parent</button>
        <button title="First child element" onClick={() => moveTo(draft.element.firstElementChild)}>↓ Child</button>
      </div>

      <label style={ui.column}>
        Name of the list
        <input value={draft.key} onChange={e => onChange({ ...draft, key: e.target.value })} />
      </label>
      {keyError && <div style={ui.error}>{keyError}</div>}

      <label style={ui.column}>
        Rows are found by
        <select value={draft.chosen} onChange={e => onChange({ ...draft, chosen: Number(e.target.value) })}>
          {draft.candidates.map(({ candidate, count }, index) => (
            <option key={index} value={index}>
              {candidate.selector} ({count} found)
            </option>
          ))}
        </select>
      </label>
      {draft.candidates.length === 0 && <div style={ui.error}>No selector found for this element. Try its parent.</div>}
      {chosen && (
        <div style={ui.muted}>
          {chosen.count} found, highlighted in green. All the rows should be highlighted; pick the parent or another selector if not.
        </div>
      )}

      <div style={ui.row}>
        <button
          disabled={!chosen || !!keyError}
          onClick={() =>
            onSave({
              key: draft.key,
              // Fallbacks must find as many rows as the main selector, or they would read other elements
              rowLocator: [
                chosen.candidate,
                ...draft.candidates
                  .filter((item, i) => i !== draft.chosen && item.count === chosen.count)
                  .map(item => item.candidate),
              ].slice(0, MAX_FALLBACKS),
              fields: draft.fields,
              computed: draft.computed,
            })
          }
        >
          Save
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};
