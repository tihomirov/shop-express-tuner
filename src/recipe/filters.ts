import { LookupTable } from './types';

export type FilterEnv = Readonly<{
  tables: ReadonlyArray<LookupTable>;
}>;

type Filter = (input: string, args: string[], env: FilterEnv) => string;

// "1 990,50 ₴" -> 1990.5
export const toNumber = (text: string): number => parseFloat(text.replace(/[^\d.,-]/g, '').replace(',', '.'));

// Rounds away float noise like 1964.1299999
export const formatNumber = (value: number): string =>
  Number.isFinite(value) ? String(Math.round(value * 1e8) / 1e8) : '';

const arithmetic =
  (calc: (value: number, arg: number) => number): Filter =>
  (input, [arg = '']) =>
    formatNumber(calc(toNumber(input), toNumber(arg)));

function matchesRule(text: string, match: string, pattern: string): boolean {
  switch (match) {
    case 'equals':
      return text === pattern;
    case 'startsWith':
      return text.startsWith(pattern);
    case 'contains':
      return text.includes(pattern);
    case 'regex':
      try {
        return new RegExp(pattern).test(text);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export const FILTERS: Readonly<Record<string, Filter>> = {
  trim: input => input.trim(),
  lower: input => input.toLowerCase(),
  upper: input => input.toUpperCase(),
  url: input => encodeURIComponent(input),
  prefix: (input, [text = '']) => (input ? text + input : input),
  suffix: (input, [text = '']) => (input ? input + text : input),
  default: (input, [fallback = '']) => input || fallback,
  // Part of the text split by a separator; a negative index counts from the end
  split: (input, [separator = ' ', index = '0']) => {
    const parts = input.split(separator);
    const position = parseInt(index, 10);
    return (position < 0 ? parts[parts.length + position] : parts[position]) ?? '';
  },
  replace: (input, [pattern = '', replacement = '']) => {
    try {
      return input.replace(new RegExp(pattern, 'g'), replacement);
    } catch {
      return input;
    }
  },
  slice: (input, [start = '0', end]) =>
    input.slice(parseInt(start, 10), end === undefined ? undefined : parseInt(end, 10)),
  // A value of a "Label: value, Label: value" list; falls back to the value at the index when there is no such label
  kv: (input, [label = '', fallbackIndex]) => {
    const pairs = input.split(',').map(pair => pair.split(':').map(part => part.trim()));
    const fallback = fallbackIndex === undefined ? undefined : pairs[parseInt(fallbackIndex, 10)];
    return (pairs.find(([name]) => name === label) ?? fallback)?.[1] ?? '';
  },
  number: input => formatNumber(toNumber(input)),
  // Whole numbers stay whole, others get the given number of decimals
  round: (input, [digits = '0']) => {
    const decimals = parseInt(digits, 10);
    const factor = 10 ** decimals;
    const rounded = Math.round(toNumber(input) * factor) / factor;
    if (!Number.isFinite(rounded)) {
      return '';
    }
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(decimals);
  },
  add: arithmetic((value, arg) => value + arg),
  sub: arithmetic((value, arg) => value - arg),
  subFrom: arithmetic((value, arg) => arg - value),
  mul: arithmetic((value, arg) => value * arg),
  div: arithmetic((value, arg) => value / arg),
  // The value minus a percent, rounded to cents: 1990 | percentOff(1.3) -> 1964.13
  percentOff: arithmetic((value, percent) => Math.round(value * (100 - percent)) / 100),
  eq: (input, [other = '']) => (input === other ? 'true' : ''),
  ne: (input, [other = '']) => (input !== other ? 'true' : ''),
  // The first argument when the value is not empty, the second one otherwise
  then: (input, [whenFilled = '', whenEmpty = '']) => (input ? whenFilled : whenEmpty),
  lookup: (input, [tableName = '', fallback = ''], { tables }) => {
    const table = tables.find(({ name }) => name === tableName);
    return table?.rules.find(rule => matchesRule(input, rule.match, rule.pattern))?.value ?? fallback;
  },
};

export const FILTER_NAMES = Object.keys(FILTERS);
