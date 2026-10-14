import { FilterEnv } from './filters';
import { readElement, resolveLocator, resolveLocatorAll, Root } from './locator';
import { applyPipeline, renderTemplate } from './template';
import { Collection, ComputedField, ExtractResult, Field, Recipe, Values } from './types';

// dd.mm.yyyy
export const formatDate = (date: Date) =>
  [date.getDate(), date.getMonth() + 1].map(part => String(part).padStart(2, '0')).join('.') + `.${date.getFullYear()}`;

// Value of a field, or undefined when its element is not on the page
export function extractField(root: Root, field: Field, ctx: Values, env: FilterEnv): string | undefined {
  const element = resolveLocator(root, field.locator);
  if (!element) {
    return undefined;
  }

  const raw = readElement(element, field.extract, field.attr);
  return field.pipeline ? applyPipeline(raw, field.pipeline, ctx, env).text : raw;
}

function addComputed(computed: ReadonlyArray<ComputedField>, values: Record<string, string>, env: FilterEnv) {
  for (const { key, template, when } of computed) {
    const enabled = !when || renderTemplate(when, values, env).text !== '';
    values[key] = enabled ? renderTemplate(template, values, env).text : '';
  }
}

function extractCollection(root: Root, collection: Collection, base: Values, env: FilterEnv, missing: string[]) {
  const { elements } = resolveLocatorAll(root, collection.rowLocator);

  if (elements.length === 0) {
    missing.push(collection.key);
  }

  return elements.map(row => {
    const values: Record<string, string> = { ...base };
    const rowKeys = new Set<string>();

    for (const field of collection.fields) {
      const value = extractField(row, field, values, env);
      if (value === undefined) {
        missing.push(`${collection.key}.${field.key}`);
      }
      values[field.key] = value ?? '';
      rowKeys.add(field.key);
    }
    addComputed(collection.computed, values, env);
    collection.computed.forEach(({ key }) => rowKeys.add(key));

    // Keep only the row's own values; the record values are added again when the row is used
    return Object.fromEntries(Object.entries(values).filter(([key]) => rowKeys.has(key)));
  });
}

export function extractRecipe(recipe: Recipe, root: Root, now: Date = new Date()): ExtractResult {
  const env: FilterEnv = { tables: recipe.tables };
  const missing: string[] = [];
  const values: Record<string, string> = { today: formatDate(now), ...recipe.constants };

  for (const field of recipe.fields) {
    const value = extractField(root, field, values, env);
    if (value === undefined) {
      missing.push(field.key);
    }
    values[field.key] = value ?? '';
  }
  addComputed(recipe.computed, values, env);

  const collections: Record<string, Values[]> = {};
  for (const collection of recipe.collections) {
    collections[collection.key] = extractCollection(root, collection, values, env, missing);
  }

  return { values, collections, missing };
}
