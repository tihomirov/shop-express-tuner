import React, { FC } from 'react';
import { describeCandidate } from '../../recipe/describe';
import { EXTRACT_MODES, ComputedField, ExtractMode, Field, Locator, LocatorCandidate, Recipe } from '../../recipe/types';
import { validateExpression } from '../../recipe/template';
import { ListEditor, styles, TemplateInput } from './common';

const emptyCandidate = (): LocatorCandidate => ({ kind: 'css', selector: '' });

const WithinEditor: FC<{
  within: LocatorCandidate['within'];
  onChange: (within: LocatorCandidate['within']) => void;
}> = ({ within, onChange }) => (
  <span style={styles.row}>
    <input
      placeholder="only inside the block titled… (optional)"
      value={within?.text ?? ''}
      onChange={e => onChange(e.target.value ? { ...within, text: e.target.value } : undefined)}
      style={{ flex: 1 }}
    />
    {within && (
      <input
        placeholder="title tag, e.g. p"
        value={within.selector ?? ''}
        onChange={e => onChange({ ...within, selector: e.target.value || undefined })}
        style={{ width: '110px' }}
      />
    )}
  </span>
);

// The ways to find an element; they are tried in order
export const LocatorEditor: FC<{ locator: Locator; onChange: (locator: Locator) => void }> = ({ locator, onChange }) => (
  <ListEditor
    compact
    items={locator as LocatorCandidate[]}
    onChange={onChange}
    create={emptyCandidate}
    addLabel="Add way to find"
    render={(candidate, update) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <span style={styles.row}>
          <select
            value={candidate.kind}
            onChange={e =>
              update((e.target.value === 'css' ? { kind: 'css', selector: '' } : { kind: 'label', label: '' }) as Partial<LocatorCandidate>)
            }
          >
            <option value="css">CSS selector</option>
            <option value="label">By label</option>
          </select>
          {candidate.kind === 'css' ? (
            <input
              placeholder="CSS selector"
              value={candidate.selector}
              onChange={e => update({ selector: e.target.value })}
              style={{ ...styles.mono, flex: 1 }}
            />
          ) : (
            <>
              <input placeholder="label text" value={candidate.label} onChange={e => update({ label: e.target.value })} style={{ flex: 1 }} />
              <input
                placeholder="label tag/selector"
                value={candidate.labelSelector ?? ''}
                onChange={e => update({ labelSelector: e.target.value || undefined })}
                style={{ ...styles.mono, width: '120px' }}
              />
              <input
                placeholder="value selector"
                value={candidate.valueSelector ?? ''}
                onChange={e => update({ valueSelector: e.target.value || undefined })}
                style={{ ...styles.mono, width: '120px' }}
              />
            </>
          )}
        </span>
        <WithinEditor within={candidate.within} onChange={within => update({ within })} />
      </div>
    )}
  />
);

const blankField = (): Field => ({ key: '', locator: [emptyCandidate()], extract: 'text' });

type FieldsEditorProps = Readonly<{
  fields: ReadonlyArray<Field>;
  onChange: (fields: Field[]) => void;
}>;

export const FieldsEditor: FC<FieldsEditorProps> = ({ fields, onChange }) => (
  <ListEditor
    items={fields as Field[]}
    onChange={onChange}
    create={blankField}
    addLabel="Add field manually"
    render={(field, update) => (
      <>
        <div style={styles.row}>
          <label style={styles.label}>
            Name
            <input value={field.key} onChange={e => update({ key: e.target.value })} />
          </label>
          <label style={styles.label}>
            Read
            <select value={field.extract} onChange={e => update({ extract: e.target.value as ExtractMode })}>
              {EXTRACT_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </label>
          {field.extract === 'attr' && (
            <label style={styles.label}>
              Attribute
              <input value={field.attr ?? ''} onChange={e => update({ attr: e.target.value || undefined })} />
            </label>
          )}
        </div>
        <label style={styles.label}>
          Transform
          <input
            value={field.pipeline ?? ''}
            placeholder='e.g. split("₴", 0) | number'
            style={styles.mono}
            onChange={e => update({ pipeline: e.target.value || undefined })}
          />
        </label>
        {field.pipeline && validateExpression(field.pipeline, 'pipeline') && (
          <div style={styles.error}>{validateExpression(field.pipeline, 'pipeline')}</div>
        )}
        <details>
          <summary style={styles.muted}>
            Found by: {field.locator[0] ? describeCandidate(field.locator[0]) : 'nothing'}
            {field.sample ? ` · sample: ${field.sample}` : ''}
          </summary>
          <LocatorEditor locator={field.locator} onChange={locator => update({ locator })} />
        </details>
      </>
    )}
  />
);

type ComputedEditorProps = Readonly<{
  computed: ReadonlyArray<ComputedField>;
  onChange: (computed: ComputedField[]) => void;
  recipe: Recipe;
  collectionKey?: string;
  keys: ReadonlyArray<string>;
}>;

// Computed fields can use the ones above them in the list
export const ComputedEditor: FC<ComputedEditorProps> = ({ computed, onChange, recipe, keys }) => (
  <ListEditor
    items={computed as ComputedField[]}
    onChange={onChange}
    create={(): ComputedField => ({ key: '', template: '' })}
    addLabel="Add computed field"
    render={(item, update, index) => {
      // The fields of the record or the row, and the computed fields above this one
      const available = [...keys.filter(key => !computed.some(other => other.key === key)), ...computed.slice(0, index).map(({ key }) => key)];
      return (
        <>
          <label style={styles.label}>
            Name
            <input value={item.key} onChange={e => update({ key: e.target.value })} />
          </label>
          <label style={styles.label}>
            Value
            <TemplateInput value={item.template} onChange={template => update({ template })} recipe={recipe} keys={available} placeholder='e.g. {fullName|split(" ", 1)}' />
          </label>
          <label style={styles.label}>
            Only when (optional, not empty)
            <TemplateInput value={item.when ?? ''} onChange={when => update({ when: when || undefined })} recipe={recipe} keys={available} placeholder='e.g. {paymentKind|eq("card")}' />
          </label>
        </>
      );
    }}
  />
);
