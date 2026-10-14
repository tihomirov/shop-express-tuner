// A recipe describes, for one site: what to read from the page, how to transform it and what to show.

export type ExtractMode = 'text' | 'value' | 'attr' | 'ownText' | 'html';

export const EXTRACT_MODES: ReadonlyArray<ExtractMode> = ['text', 'value', 'attr', 'ownText', 'html'];

// Narrows the search to the parent of the element whose whole text is `text`, e.g. a section title
export type Within = Readonly<{
  text: string;
  selector?: string;
}>;

export type CssCandidate = Readonly<{
  kind: 'css';
  selector: string;
  within?: Within;
}>;

// Finds the value by its label: the element with the text `label` and the element that follows it.
// Survives layout changes better than a path of tags and classes.
export type LabelCandidate = Readonly<{
  kind: 'label';
  label: string;
  labelSelector?: string;
  // Without it the first following sibling with text is the value (climbing up from the label)
  valueSelector?: string;
  within?: Within;
}>;

export type LocatorCandidate = CssCandidate | LabelCandidate;

// Candidates are tried in order, the first one that finds an element wins
export type Locator = ReadonlyArray<LocatorCandidate>;

export type Field = Readonly<{
  key: string;
  locator: Locator;
  extract: ExtractMode;
  // Attribute name for the "attr" mode
  attr?: string;
  // Filters applied to the raw value, e.g. `split("₴", 0) | number`
  pipeline?: string;
  // The value seen when the field was picked, to diagnose a broken locator later
  sample?: string;
}>;

// A field calculated from the others with a template. Empty when `when` is set and renders empty.
export type ComputedField = Readonly<{
  key: string;
  template: string;
  when?: string;
}>;

// Repeating group of elements, e.g. order items. Fields are located relative to each row.
export type Collection = Readonly<{
  key: string;
  rowLocator: Locator;
  fields: ReadonlyArray<Field>;
  computed: ReadonlyArray<ComputedField>;
}>;

export type LookupMatch = 'equals' | 'startsWith' | 'contains' | 'regex';

export const LOOKUP_MATCHES: ReadonlyArray<LookupMatch> = ['equals', 'startsWith', 'contains', 'regex'];

export type LookupRule = Readonly<{
  match: LookupMatch;
  pattern: string;
  value: string;
}>;

// Used by the `lookup("name")` filter; the first matching rule wins
export type LookupTable = Readonly<{
  name: string;
  rules: ReadonlyArray<LookupRule>;
}>;

export type ActionKind = 'copy' | 'open' | 'copyAndOpen';

export const ACTION_KINDS: ReadonlyArray<ActionKind> = ['copy', 'open', 'copyAndOpen'];

export type Action = Readonly<{
  id: string;
  label: string;
  kind: ActionKind;
  // What to copy; the message text by default (for actions of a message output)
  text?: string;
  // Template of the URL to open; `{message}` is the message text
  url?: string;
}>;

export type Column = Readonly<{
  header?: string;
  template: string;
  // "record" cells are rendered once and span all rows, "row" cells once per collection row
  scope: 'record' | 'row';
}>;

export type TableOutput = Readonly<{
  id: string;
  type: 'table';
  title: string;
  // Collection that gives the table rows
  rows?: string;
  // Row field with the number of copies of the row, e.g. the item quantity
  repeatBy?: string;
  columns: ReadonlyArray<Column>;
}>;

export type MessageOutput = Readonly<{
  id: string;
  type: 'message';
  title: string;
  template: string;
  actions: ReadonlyArray<Action>;
}>;

export type ButtonsOutput = Readonly<{
  id: string;
  type: 'buttons';
  title: string;
  actions: ReadonlyArray<Action>;
}>;

export type Output = TableOutput | MessageOutput | ButtonsOutput;

export const OUTPUT_TYPES: ReadonlyArray<Output['type']> = ['table', 'message', 'buttons'];

export type Recipe = Readonly<{
  id: string;
  name: string;
  version: 1;
  // URL patterns where the recipe applies; `*` matches anything
  match: ReadonlyArray<string>;
  // Fixed values available to every template, e.g. a commission percent
  constants: Readonly<Record<string, string>>;
  fields: ReadonlyArray<Field>;
  computed: ReadonlyArray<ComputedField>;
  collections: ReadonlyArray<Collection>;
  tables: ReadonlyArray<LookupTable>;
  outputs: ReadonlyArray<Output>;
}>;

export type Values = Readonly<Record<string, string>>;

export type ExtractResult = Readonly<{
  // Constants, fields and computed fields of the record
  values: Values;
  // Rows of every collection: their own fields and computed fields
  collections: Readonly<Record<string, ReadonlyArray<Values>>>;
  // Keys of fields whose element was not found on the page
  missing: ReadonlyArray<string>;
}>;
