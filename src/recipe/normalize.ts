import { isEnum, isNonArrayObject, isString } from '../utils/is-it';
import { PlainObject } from '../utils/types';
import {
  ACTION_KINDS,
  Action,
  Collection,
  Column,
  ComputedField,
  EXTRACT_MODES,
  Field,
  LOOKUP_MATCHES,
  LocatorCandidate,
  LookupTable,
  Output,
  Recipe,
  Within,
} from './types';

// Recipes come from storage or from an imported file, so every part is checked and malformed parts are dropped

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown, fallback = ''): string => (isString(value) ? value : fallback);
const optionalString = (value: unknown): string | undefined => (isString(value) && value !== '' ? value : undefined);
const asObjects = (value: unknown): PlainObject[] => asArray(value).filter(isNonArrayObject);

function normalizeWithin(value: unknown): Within | undefined {
  if (!isNonArrayObject(value) || !isString(value.text)) {
    return undefined;
  }
  return { text: value.text, selector: optionalString(value.selector) };
}

function normalizeCandidate(value: PlainObject): LocatorCandidate | undefined {
  const within = normalizeWithin(value.within);

  if (value.kind === 'css' && isString(value.selector) && value.selector) {
    return { kind: 'css', selector: value.selector, within };
  }
  if (value.kind === 'label' && isString(value.label) && value.label) {
    return {
      kind: 'label',
      label: value.label,
      labelSelector: optionalString(value.labelSelector),
      valueSelector: optionalString(value.valueSelector),
      within,
    };
  }
  return undefined;
}

const normalizeLocator = (value: unknown): LocatorCandidate[] =>
  asObjects(value).flatMap(candidate => normalizeCandidate(candidate) ?? []);

const isExtractMode = isEnum(Object.fromEntries(EXTRACT_MODES.map(mode => [mode, mode])));

function normalizeField(value: PlainObject): Field | undefined {
  if (!isString(value.key) || !value.key) {
    return undefined;
  }
  return {
    key: value.key,
    locator: normalizeLocator(value.locator),
    extract: isExtractMode(value.extract) ? value.extract : 'text',
    attr: optionalString(value.attr),
    pipeline: optionalString(value.pipeline),
    sample: optionalString(value.sample),
  };
}

function normalizeComputed(value: PlainObject): ComputedField | undefined {
  if (!isString(value.key) || !value.key || !isString(value.template)) {
    return undefined;
  }
  return { key: value.key, template: value.template, when: optionalString(value.when) };
}

const normalizeFields = (value: unknown) => asObjects(value).flatMap(field => normalizeField(field) ?? []);
const normalizeComputedList = (value: unknown) => asObjects(value).flatMap(field => normalizeComputed(field) ?? []);

function normalizeCollection(value: PlainObject): Collection | undefined {
  if (!isString(value.key) || !value.key) {
    return undefined;
  }
  return {
    key: value.key,
    rowLocator: normalizeLocator(value.rowLocator),
    fields: normalizeFields(value.fields),
    computed: normalizeComputedList(value.computed),
  };
}

function normalizeTable(value: PlainObject): LookupTable | undefined {
  if (!isString(value.name) || !value.name) {
    return undefined;
  }
  return {
    name: value.name,
    rules: asObjects(value.rules).flatMap(rule =>
      isString(rule.pattern) && isString(rule.value)
        ? [{ match: LOOKUP_MATCHES.find(match => match === rule.match) ?? 'equals', pattern: rule.pattern, value: rule.value }]
        : [],
    ),
  };
}

function normalizeAction(value: PlainObject, index: number): Action {
  return {
    id: asString(value.id, `action-${index}`),
    label: asString(value.label, 'Action'),
    kind: ACTION_KINDS.find(kind => kind === value.kind) ?? 'copy',
    text: isString(value.text) ? value.text : undefined,
    url: optionalString(value.url),
  };
}

function normalizeColumn(value: PlainObject): Column {
  return {
    header: optionalString(value.header),
    template: asString(value.template),
    scope: value.scope === 'row' ? 'row' : 'record',
  };
}

function normalizeOutput(value: PlainObject, index: number): Output | undefined {
  const base = { id: asString(value.id, `output-${index}`), title: asString(value.title) };
  const actions = asObjects(value.actions).map(normalizeAction);

  switch (value.type) {
    case 'table':
      return {
        ...base,
        type: 'table',
        rows: optionalString(value.rows),
        repeatBy: optionalString(value.repeatBy),
        columns: asObjects(value.columns).map(normalizeColumn),
      };
    case 'message':
      return { ...base, type: 'message', template: asString(value.template), actions };
    case 'buttons':
      return { ...base, type: 'buttons', actions };
    default:
      return undefined;
  }
}

function normalizeConstants(value: unknown): Record<string, string> {
  return isNonArrayObject(value)
    ? Object.fromEntries(Object.entries(value).flatMap(([key, constant]) => (isString(constant) ? [[key, constant]] : [])))
    : {};
}

export function normalizeRecipe(value: unknown): Recipe | undefined {
  if (!isNonArrayObject(value) || !isString(value.id) || !value.id) {
    return undefined;
  }

  return {
    id: value.id,
    name: asString(value.name, 'Untitled recipe'),
    version: 1,
    match: asArray(value.match).filter(isString),
    constants: normalizeConstants(value.constants),
    fields: normalizeFields(value.fields),
    computed: normalizeComputedList(value.computed),
    collections: asObjects(value.collections).flatMap(collection => normalizeCollection(collection) ?? []),
    tables: asObjects(value.tables).flatMap(table => normalizeTable(table) ?? []),
    outputs: asObjects(value.outputs).flatMap((output, index) => normalizeOutput(output, index) ?? []),
  };
}

export const normalizeRecipes = (value: unknown): Recipe[] =>
  asArray(value).flatMap(recipe => normalizeRecipe(recipe) ?? []);

export function createEmptyRecipe(name: string, match: string[]): Recipe {
  return {
    id: crypto.randomUUID(),
    name,
    version: 1,
    match,
    constants: {},
    fields: [],
    computed: [],
    collections: [],
    tables: [],
    outputs: [],
  };
}
