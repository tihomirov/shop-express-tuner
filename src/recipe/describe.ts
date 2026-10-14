import { LocatorCandidate, Within } from './types';

const describeWithin = (within: Within | undefined) => (within ? ` (in the block "${within.text}")` : '');

// A short human readable description of how a candidate finds its element
export function describeCandidate(candidate: LocatorCandidate): string {
  if (candidate.kind === 'css') {
    return `${candidate.selector}${describeWithin(candidate.within)}`;
  }
  const value = candidate.valueSelector ? `next ${candidate.valueSelector}` : 'next value';
  return `label "${candidate.label}" → ${value}${describeWithin(candidate.within)}`;
}

const KEY_PATTERN = /^[\p{L}_][\p{L}\p{N}_]*$/u;

// Error for a field name that cannot be used in templates, or that is taken
export function validateKey(key: string, taken: ReadonlyArray<string>): string | undefined {
  if (!KEY_PATTERN.test(key)) {
    return 'Use letters, digits and "_"; start with a letter.';
  }
  return taken.includes(key) ? `The name "${key}" is already used.` : undefined;
}

// A field name from a label like "Phone number" -> "phoneNumber"; empty if the label is not in latin letters
export function suggestKey(label: string | undefined, taken: ReadonlyArray<string>): string {
  const words = label?.match(/[a-z0-9]+/gi) ?? [];
  const base =
    words.length > 0 && /^[a-z]/i.test(words[0] ?? '') && !/[^\x00-\x7F]/.test(label ?? '')
      ? words.map((word, index) => (index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase())).join('')
      : 'field';

  if (!taken.includes(base)) {
    return base;
  }
  let counter = 2;
  while (taken.includes(`${base}${counter}`)) {
    counter++;
  }
  return `${base}${counter}`;
}
