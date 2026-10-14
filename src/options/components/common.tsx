import React, { ReactNode, useRef } from 'react';
import { renderTemplate } from '../../recipe/template';
import { Recipe } from '../../recipe/types';

export const styles = {
  section: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' } as React.CSSProperties,
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: '#fafafa',
  } as React.CSSProperties,
  row: { display: 'flex', gap: '6px', alignItems: 'center' } as React.CSSProperties,
  label: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 } as React.CSSProperties,
  muted: { color: '#666', fontSize: '12px' } as React.CSSProperties,
  error: { color: '#b00020', fontSize: '12px' } as React.CSSProperties,
  mono: { fontFamily: 'monospace', fontSize: '13px' } as React.CSSProperties,
};

export const Section = ({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) => (
  <section style={styles.section}>
    <h2 style={{ margin: 0 }}>{title}</h2>
    {hint && <p style={{ ...styles.muted, margin: 0 }}>{hint}</p>}
    {children}
  </section>
);

type ListEditorProps<T> = Readonly<{
  items: ReadonlyArray<T>;
  onChange: (items: T[]) => void;
  create: () => T;
  addLabel: string;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  // Plain rows without a frame, for short lists
  compact?: boolean;
}>;

// Editable list: items can be reordered, removed and added
export function ListEditor<T>({ items, onChange, create, addLabel, render, compact }: ListEditorProps<T>) {
  const replace = (index: number, item: T) => onChange(items.map((existing, i) => (i === index ? item : existing)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) {
      return;
    }
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item, index) => (
        <div key={index} style={{ ...(compact ? styles.row : { ...styles.card, flexDirection: 'row', alignItems: 'flex-start' }) }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: compact ? 'row' : 'column', gap: '6px' }}>
            {render(item, patch => replace(index, { ...item, ...patch }), index)}
          </div>
          <span style={{ ...styles.row, gap: '2px' }}>
            <button title="Move up" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
            <button title="Move down" onClick={() => move(index, 1)} disabled={index === items.length - 1}>↓</button>
            <button title="Remove" onClick={() => onChange(items.filter((_, i) => i !== index))}>✕</button>
          </span>
        </div>
      ))}
      <div>
        <button onClick={() => onChange([...items, create()])}>+ {addLabel}</button>
      </div>
    </div>
  );
}

// Names usable in a template: constants, fields and computed fields, plus the rows' own ones
export function availableKeys(recipe: Recipe, collectionKey?: string): string[] {
  const collection = recipe.collections.find(({ key }) => key === collectionKey);
  return [
    'today',
    ...Object.keys(recipe.constants),
    ...recipe.fields.map(({ key }) => key),
    ...recipe.computed.map(({ key }) => key),
    ...(collection ? [...collection.fields, ...collection.computed].map(({ key }) => key) : []),
  ];
}

type TemplateInputProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  recipe: Recipe;
  // Names of the fields that can be used in the template; the click on a name inserts it
  keys: ReadonlyArray<string>;
  multiline?: boolean;
  placeholder?: string;
  extraKeys?: ReadonlyArray<string>;
}>;

// Text with `{field|filter}` parts, with warnings about unknown fields and filters
export function TemplateInput({ value, onChange, recipe, keys, multiline, placeholder, extraKeys = [] }: TemplateInputProps) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const known = [...keys, ...extraKeys];

  const insert = (key: string) => {
    const element = ref.current;
    const token = `{${key}}`;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const evaluation = renderTemplate(value, Object.fromEntries(known.map(key => [key, ''])), { tables: recipe.tables });
  const problems = [
    ...evaluation.errors,
    ...[...new Set(evaluation.missing)].map(name => `Unknown field "${name}"`),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
      {multiline ? (
        <textarea ref={ref} rows={4} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={{ fontFamily: 'inherit', fontSize: '14px' }} />
      ) : (
        <input ref={ref} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={styles.mono} />
      )}
      <details>
        <summary style={styles.muted}>Insert a field</summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
          {known.map(key => (
            <button key={key} type="button" style={{ fontSize: '11px', padding: '0 4px' }} onClick={() => insert(key)}>
              {key}
            </button>
          ))}
        </div>
      </details>
      {problems.map(problem => <div key={problem} style={styles.error}>{problem}</div>)}
    </div>
  );
}
