import React, { FC } from 'react';
import { ACTION_KINDS, Action, ActionKind, Column, Output, OUTPUT_TYPES, Recipe } from '../../recipe/types';
import { availableKeys, ListEditor, styles, TemplateInput } from './common';

const newId = () => crypto.randomUUID().slice(0, 8);

const ACTION_LABELS: Record<ActionKind, string> = {
  copy: 'Copy text',
  open: 'Open link',
  copyAndOpen: 'Copy text and open link',
};

type ActionsEditorProps = Readonly<{
  actions: ReadonlyArray<Action>;
  onChange: (actions: Action[]) => void;
  recipe: Recipe;
  // In a message output the actions can use the message text
  inMessage: boolean;
}>;

const ActionsEditor: FC<ActionsEditorProps> = ({ actions, onChange, recipe, inMessage }) => {
  const keys = availableKeys(recipe);
  const extraKeys = ['message'];

  return (
    <ListEditor
      items={actions as Action[]}
      onChange={onChange}
      create={(): Action => ({ id: newId(), label: 'Copy', kind: 'copy' })}
      addLabel="Add button"
      render={(action, update) => (
        <>
          <div style={styles.row}>
            <label style={styles.label}>
              Button
              <input value={action.label} onChange={e => update({ label: e.target.value })} />
            </label>
            <label style={styles.label}>
              Does
              <select value={action.kind} onChange={e => update({ kind: e.target.value as ActionKind })}>
                {ACTION_KINDS.map(kind => <option key={kind} value={kind}>{ACTION_LABELS[kind]}</option>)}
              </select>
            </label>
          </div>
          {action.kind !== 'open' && (
            <label style={styles.label}>
              Text to copy {inMessage ? '(empty: the message)' : ''}
              <TemplateInput
                value={action.text ?? ''}
                onChange={text => update({ text: text || undefined })}
                recipe={recipe}
                keys={keys}
                extraKeys={extraKeys}
              />
            </label>
          )}
          {action.kind !== 'copy' && (
            <label style={styles.label}>
              Link to open (https:, tg:, viber:, mailto:, tel:…)
              <TemplateInput
                value={action.url ?? ''}
                onChange={url => update({ url: url || undefined })}
                recipe={recipe}
                keys={keys}
                extraKeys={extraKeys}
                placeholder="https://t.me/{phone}?text={message|url}"
              />
            </label>
          )}
        </>
      )}
    />
  );
};

const ColumnsEditor: FC<{
  columns: ReadonlyArray<Column>;
  onChange: (columns: Column[]) => void;
  recipe: Recipe;
  rows?: string;
}> = ({ columns, onChange, recipe, rows }) => (
  <ListEditor
    compact
    items={columns as Column[]}
    onChange={onChange}
    create={(): Column => ({ template: '', scope: 'record' })}
    addLabel="Add column"
    render={(column, update) => (
      <>
        <TemplateInput
          value={column.template}
          onChange={template => update({ template })}
          recipe={recipe}
          keys={availableKeys(recipe, column.scope === 'row' ? rows : undefined)}
          placeholder="text and {fields}"
        />
        <select
          value={column.scope}
          title="A cell of the record is shown once; a cell of the row is repeated for every row"
          onChange={e => update({ scope: e.target.value as Column['scope'] })}
        >
          <option value="record">once</option>
          <option value="row">per row</option>
        </select>
      </>
    )}
  />
);

const newOutput = (type: Output['type']): Output => {
  const base = { id: newId(), title: type === 'table' ? 'Table' : type === 'message' ? 'Message' : 'Buttons' };
  switch (type) {
    case 'table':
      return { ...base, type, columns: [] };
    case 'message':
      return { ...base, type, template: '', actions: [{ id: newId(), label: 'Copy', kind: 'copy' }] };
    case 'buttons':
      return { ...base, type, actions: [] };
  }
};

type OutputsEditorProps = Readonly<{
  recipe: Recipe;
  onChange: (outputs: Output[]) => void;
}>;

export const OutputsEditor: FC<OutputsEditorProps> = ({ recipe, onChange }) => {
  const rowFieldKeys = (collectionKey?: string) => {
    const collection = recipe.collections.find(({ key }) => key === collectionKey);
    return collection ? [...collection.fields, ...collection.computed].map(({ key }) => key) : [];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <ListEditor
        items={recipe.outputs as Output[]}
        onChange={onChange}
        create={() => newOutput('message')}
        addLabel="Add output"
        render={(output, update) => (
          <>
            <div style={styles.row}>
              <label style={styles.label}>
                Title
                <input value={output.title} onChange={e => update({ title: e.target.value })} />
              </label>
              <label style={styles.label}>
                Type
                <select
                  value={output.type}
                  onChange={e => {
                    // The id stays, so the output keeps its place; its content starts over
                    const fresh = newOutput(e.target.value as Output['type']);
                    update({ ...fresh, id: output.id, title: output.title } as Partial<Output>);
                  }}
                >
                  {OUTPUT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
            </div>

            {output.type === 'message' && (
              <>
                <label style={styles.label}>
                  Text
                  <TemplateInput
                    multiline
                    value={output.template}
                    onChange={template => update({ template } as Partial<Output>)}
                    recipe={recipe}
                    keys={availableKeys(recipe)}
                  />
                </label>
                <ActionsEditor
                  actions={output.actions}
                  recipe={recipe}
                  inMessage
                  onChange={actions => update({ actions } as Partial<Output>)}
                />
              </>
            )}

            {output.type === 'buttons' && (
              <ActionsEditor
                actions={output.actions}
                recipe={recipe}
                inMessage={false}
                onChange={actions => update({ actions } as Partial<Output>)}
              />
            )}

            {output.type === 'table' && (
              <>
                <div style={styles.row}>
                  <label style={styles.label}>
                    One table row per row of the list
                    <select value={output.rows ?? ''} onChange={e => update({ rows: e.target.value || undefined } as Partial<Output>)}>
                      <option value="">(single row)</option>
                      {recipe.collections.map(({ key }) => <option key={key} value={key}>{key}</option>)}
                    </select>
                  </label>
                  <label style={styles.label}>
                    Repeat a row by the number in
                    <select value={output.repeatBy ?? ''} onChange={e => update({ repeatBy: e.target.value || undefined } as Partial<Output>)}>
                      <option value="">(no repeat)</option>
                      {rowFieldKeys(output.rows).map(key => <option key={key} value={key}>{key}</option>)}
                    </select>
                  </label>
                </div>
                <ColumnsEditor
                  columns={output.columns}
                  recipe={recipe}
                  rows={output.rows}
                  onChange={columns => update({ columns } as Partial<Output>)}
                />
              </>
            )}
          </>
        )}
      />
    </div>
  );
};
