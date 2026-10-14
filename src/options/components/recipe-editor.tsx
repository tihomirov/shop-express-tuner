import React, { FC, useEffect, useMemo, useState } from 'react';
import { OutputsView } from '../../components/outputs-view';
import { recomputeResult } from '../../recipe/extract';
import { normalizeRecipe } from '../../recipe/normalize';
import { Collection, ExtractResult, LookupMatch, LookupRule, LookupTable, LOOKUP_MATCHES, Recipe } from '../../recipe/types';
import { availableKeys, ListEditor, Section, styles } from './common';
import { ComputedEditor, FieldsEditor, LocatorEditor } from './fields-editor';
import { OutputsEditor } from './outputs-editor';

type RecipeEditorProps = Readonly<{
  recipe: Recipe;
  onChange: (recipe: Recipe) => void;
  lastResult?: ExtractResult;
}>;

const TablesEditor: FC<{ tables: ReadonlyArray<LookupTable>; onChange: (tables: LookupTable[]) => void }> = ({ tables, onChange }) => (
  <ListEditor
    items={tables as LookupTable[]}
    onChange={onChange}
    create={() => ({ name: '', rules: [] })}
    addLabel="Add table"
    render={(table, update) => (
      <>
        <label style={styles.label}>
          Name (used as {'{field|lookup("name")}'})
          <input value={table.name} onChange={e => update({ name: e.target.value })} />
        </label>
        <ListEditor
          compact
          items={table.rules as LookupRule[]}
          onChange={rules => update({ rules })}
          create={(): LookupRule => ({ match: 'equals', pattern: '', value: '' })}
          addLabel="Add rule"
          render={(rule, updateRule) => (
            <>
              <select value={rule.match} onChange={e => updateRule({ match: e.target.value as LookupMatch })}>
                {LOOKUP_MATCHES.map(match => <option key={match} value={match}>{match}</option>)}
              </select>
              <input placeholder="text" value={rule.pattern} onChange={e => updateRule({ pattern: e.target.value })} style={{ flex: 1 }} />
              <span>→</span>
              <input placeholder="result" value={rule.value} onChange={e => updateRule({ value: e.target.value })} style={{ flex: 1 }} />
            </>
          )}
        />
      </>
    )}
  />
);

const ConstantsEditor: FC<{ constants: Recipe['constants']; onChange: (constants: Record<string, string>) => void }> = ({ constants, onChange }) => {
  // Entries are edited as a list; keys are merged back into an object
  const entries = Object.entries(constants).map(([key, value]) => ({ key, value }));
  const toObject = (items: Array<{ key: string; value: string }>) => Object.fromEntries(items.map(({ key, value }) => [key, value]));

  return (
    <ListEditor
      compact
      items={entries}
      onChange={items => onChange(toObject(items))}
      create={() => ({ key: `constant${entries.length + 1}`, value: '' })}
      addLabel="Add constant"
      render={(entry, update) => (
        <>
          <input placeholder="name" value={entry.key} onChange={e => update({ key: e.target.value })} />
          <input placeholder="value" value={entry.value} onChange={e => update({ value: e.target.value })} style={{ flex: 1 }} />
        </>
      )}
    />
  );
};

const CollectionsEditor: FC<{ recipe: Recipe; onChange: (collections: Collection[]) => void }> = ({ recipe, onChange }) => (
  <ListEditor
    items={recipe.collections as Collection[]}
    onChange={onChange}
    create={(): Collection => ({ key: '', rowLocator: [{ kind: 'css', selector: '' }], fields: [], computed: [] })}
    addLabel="Add list manually"
    render={(collection, update) => (
      <>
        <label style={styles.label}>
          Name of the list
          <input value={collection.key} onChange={e => update({ key: e.target.value })} />
        </label>
        <div>
          <div style={styles.muted}>Rows are found by</div>
          <LocatorEditor locator={collection.rowLocator} onChange={rowLocator => update({ rowLocator })} />
        </div>
        <h4 style={{ margin: '4px 0 0' }}>Fields of a row</h4>
        <FieldsEditor fields={collection.fields} onChange={fields => update({ fields })} />
        <h4 style={{ margin: '4px 0 0' }}>Computed fields of a row</h4>
        <ComputedEditor
          computed={collection.computed}
          onChange={computed => update({ computed })}
          recipe={recipe}
          collectionKey={collection.key}
          keys={availableKeys(recipe, collection.key)}
        />
      </>
    )}
  />
);

// The recipe as JSON: the way to share it, and to change what the forms cannot
const JsonEditor: FC<{ recipe: Recipe; onChange: (recipe: Recipe) => void }> = ({ recipe, onChange }) => {
  const formatted = useMemo(() => JSON.stringify(recipe, null, 2), [recipe]);
  const [text, setText] = useState(formatted);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => setText(formatted), [formatted]);

  const apply = () => {
    try {
      const parsed = normalizeRecipe({ ...JSON.parse(text), id: recipe.id });
      if (!parsed) {
        throw new Error('Not a recipe');
      }
      onChange(parsed);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <textarea rows={20} value={text} onChange={e => setText(e.target.value)} style={styles.mono} spellCheck={false} />
      {error && <div style={styles.error}>{error}</div>}
      <div>
        <button onClick={apply}>Apply JSON</button>
      </div>
    </div>
  );
};

export const RecipeEditor: FC<RecipeEditorProps> = ({ recipe, onChange, lastResult }) => {
  const set = (patch: Partial<Recipe>) => onChange({ ...recipe, ...patch });

  // The preview uses the values the popup read from the page last time, with the edited recipe applied
  const preview = useMemo(() => (lastResult ? recomputeResult(recipe, lastResult) : undefined), [recipe, lastResult]);

  return (
    <div>
      <Section title="Page" hint="The recipe is offered on pages whose address matches one of the patterns. Use * for any text.">
        <label style={styles.label}>
          Name
          <input value={recipe.name} onChange={e => set({ name: e.target.value })} />
        </label>
        <label style={styles.label}>
          Address patterns, one per line
          <textarea
            rows={3}
            value={recipe.match.join('\n')}
            placeholder="https://admin.example.com/orders/*"
            onChange={e => set({ match: e.target.value.split('\n').map(line => line.trim()).filter(Boolean) })}
            style={styles.mono}
          />
        </label>
      </Section>

      <Section
        title="Fields"
        hint='What to read from the page. Pick elements on the page itself: open the extension popup there and press "Pick fields".'
      >
        <FieldsEditor fields={recipe.fields} onChange={fields => set({ fields })} />
      </Section>

      <Section title="Lists" hint="Repeating blocks, like the items of an order. Their fields are read from every row.">
        <CollectionsEditor recipe={recipe} onChange={collections => set({ collections })} />
      </Section>

      <Section title="Computed fields" hint="Values made from other fields with a template, e.g. {fullName|split(&quot; &quot;, 1)}. Filters can be chained.">
        <ComputedEditor
          computed={recipe.computed}
          onChange={computed => set({ computed })}
          recipe={recipe}
          keys={availableKeys(recipe)}
        />
      </Section>

      <Section title="Constants" hint="Fixed values for templates, such as a commission percent.">
        <ConstantsEditor constants={recipe.constants} onChange={constants => set({ constants })} />
      </Section>

      <Section title="Lookup tables" hint='Replace a value by rules: {name|lookup("table", "fallback")}. The first matching rule wins.'>
        <TablesEditor tables={recipe.tables} onChange={tables => set({ tables })} />
      </Section>

      <Section title="Outputs" hint="What the popup shows: messages, tables to paste into a spreadsheet, and buttons.">
        <OutputsEditor recipe={recipe} onChange={outputs => set({ outputs })} />
      </Section>

      <Section title="Preview" hint="Built from the last page read by the popup with this recipe, not saved yet changes included.">
        {preview ? (
          <div style={{ ...styles.card, background: '#fff' }}>
            <OutputsView recipe={recipe} result={preview} />
          </div>
        ) : (
          <div style={styles.muted}>Open a page with this recipe and click the extension icon to get sample data.</div>
        )}
      </Section>

      <Section title="JSON">
        <JsonEditor recipe={recipe} onChange={onChange} />
      </Section>
    </div>
  );
};
