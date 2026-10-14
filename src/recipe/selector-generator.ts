import { normalizeText, readElement, resolveCandidate, Root } from './locator';
import { CssCandidate, ExtractMode, LabelCandidate, LocatorCandidate } from './types';

// Builds locators for an element picked on a page, most robust first. Every candidate is
// checked against the page: it must find the picked element (or one with the same value).

const MAX_CANDIDATES = 5;
const MAX_LABEL_LENGTH = 60;
const MAX_ANCESTOR_DEPTH = 8;

// Attributes that identify an element and do not change with the data on the page
const STABLE_ATTRIBUTES = ['data-testid', 'data-test', 'data-qa', 'data-cy', 'name', 'aria-label', 'itemprop', 'role'];

// Classes of frameworks and UI state, generated hashes and anything with numbers
const UNSTABLE_CLASS = /(^|-)(ng|is|has|js)-|^(active|open|opened|selected|disabled|hover|focus|focused|checked|show|hide|hidden|visible|collapsed|expanded|animate-.*)$|\d{2,}|^(css|sc|jsx|svelte|emotion)-|^_/i;
const UNSTABLE_ID = /\d{2,}|^:|^[a-f0-9-]{16,}$/i;

const escapeIdentifier = (value: string) => value.replace(/[^\w\u00A0-\uFFFF-]/g, '\\$&').replace(/^(\d)/, '\\3$1 ');
const escapeAttribute = (value: string) => value.replace(/["\\]/g, '\\$&');

function queryAll(root: Root, selector: string): Element[] {
  try {
    return [...root.querySelectorAll(selector)];
  } catch {
    return [];
  }
}

const isUnique = (root: Root, selector: string, target: Element) => {
  const found = queryAll(root, selector);
  return found.length === 1 && found[0] === target;
};

const stableClasses = (element: Element): string[] =>
  [...element.classList].filter(name => !UNSTABLE_CLASS.test(name) && name.length < 40);

type SimplePart = Readonly<{ selector: string; kind: 'attribute' | 'class' | 'tag' }>;

// Ways to describe one element without looking at its position, from the most to the least specific
function simpleParts(element: Element): SimplePart[] {
  const tag = element.tagName.toLowerCase();
  const parts: SimplePart[] = [];

  if (element.id && !UNSTABLE_ID.test(element.id)) {
    parts.push({ selector: `#${escapeIdentifier(element.id)}`, kind: 'attribute' });
  }
  for (const name of STABLE_ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (value && value.length < 60 && !/\d{3,}/.test(value)) {
      parts.push({ selector: `${tag}[${name}="${escapeAttribute(value)}"]`, kind: 'attribute' });
    }
  }

  const classes = stableClasses(element).map(escapeIdentifier);
  if (classes.length > 0) {
    parts.push({ selector: `${tag}.${classes.slice(0, 3).join('.')}`, kind: 'class' });
    if (classes.length > 1) {
      parts.push({ selector: `${tag}.${classes[0]}`, kind: 'class' });
    }
  }
  parts.push({ selector: tag, kind: 'tag' });

  return parts;
}

const nthSegment = (element: Element): string => {
  const tag = element.tagName.toLowerCase();
  const siblings = element.parentElement ? [...element.parentElement.children] : [];
  return siblings.length > 1 ? `${tag}:nth-child(${siblings.indexOf(element) + 1})` : tag;
};

// Elements between the target (inclusive) and the root (exclusive), the target first
function ancestorsUpTo(target: Element, root: Root, maxDepth: number): Element[] {
  const chain: Element[] = [];
  for (let element: Element | null = target; element && element !== root && chain.length <= maxDepth; element = element.parentElement) {
    chain.push(element);
  }
  return chain;
}

function cssCandidates(target: Element, root: Root): CssCandidate[] {
  const selectors: string[] = [];
  const parts = simpleParts(target);

  // 1. The element itself has an identifying attribute
  parts.filter(part => part.kind === 'attribute').forEach(part => selectors.push(part.selector));

  // 2. Its classes
  parts.filter(part => part.kind === 'class').forEach(part => selectors.push(part.selector));

  // 3. A distinctive ancestor and the way down from it
  const chain = ancestorsUpTo(target, root, MAX_ANCESTOR_DEPTH);
  for (let depth = 1; depth < chain.length; depth++) {
    const anchor = chain[depth];
    // A close ancestor needs no distinctive part, e.g. "h1 span"
    if (depth <= 3) {
      parts.forEach(part => selectors.push(`${anchor.tagName.toLowerCase()} ${part.selector}`));
    }
    const anchorPart = simpleParts(anchor).find(part => part.kind !== 'tag');
    if (!anchorPart) {
      continue;
    }
    parts.forEach(part => selectors.push(`${anchorPart.selector} ${part.selector}`));
    // The same with the exact path of tags, for targets that look like their siblings
    const path = chain.slice(0, depth).reverse().map(nthSegment).join(' > ');
    selectors.push(`${anchorPart.selector} > ${path}`);
  }

  // 4. The whole path from the root; always unique
  const fullPath = chain.slice().reverse().map(nthSegment).join(' > ');
  selectors.push(fullPath);

  return [...new Set(selectors)]
    .filter(selector => isUnique(root, selector, target))
    .map(selector => ({ kind: 'css', selector }));
}

// Short elements before the target that look like its label: "Phone" before the phone number
function labelCandidates(target: Element, root: Root, accepts: (found: Element) => boolean): LabelCandidate[] {
  const candidates: LabelCandidate[] = [];
  const targetText = normalizeText(target.textContent);

  let element: Element | null = target;
  for (let level = 0; element && element !== root && level < 4; level++, element = element.parentElement) {
    let previous = element.previousElementSibling;
    for (let steps = 0; previous && steps < 3; steps++, previous = previous.previousElementSibling) {
      const label = normalizeText(previous.textContent);
      if (!label || label.length > MAX_LABEL_LENGTH || label === targetText) {
        continue;
      }

      const labelElement = innermostWithText(previous, label);
      const labelPart = simpleParts(labelElement).find(part => part.kind !== 'attribute') ?? simpleParts(labelElement)[0];
      const valuePart = simpleParts(element).find(part => part.kind !== 'attribute');
      const valueSelector =
        valuePart && element.matches(valuePart.selector)
          ? labelElement.matches(valuePart.selector)
            ? `${valuePart.selector}:not(${labelPart.selector})`
            : valuePart.selector
          : undefined;

      for (const valueSelectorOption of [valueSelector, undefined]) {
        const candidate: LabelCandidate = {
          kind: 'label',
          label,
          labelSelector: labelPart.selector,
          valueSelector: valueSelectorOption,
        };
        const found = resolveCandidate(root, candidate)[0];
        if (found && accepts(found)) {
          candidates.push(candidate);
          break;
        }
      }
    }
  }

  return candidates;
}

function innermostWithText(element: Element, text: string): Element {
  const inner = [...element.children].find(child => normalizeText(child.textContent) === text);
  return inner ? innermostWithText(inner, text) : element;
}

export type GenerateOptions = Readonly<{
  mode?: ExtractMode;
}>;

// Locators for the element to read. They find the element itself, or for the "text" mode
// a wrapper of it with the same text, so pages that add or remove wrappers still work.
export function generateLocators(target: Element, root: Root, { mode = 'text' }: GenerateOptions = {}): LocatorCandidate[] {
  const targetText = normalizeText(target.textContent);
  const textLike = mode === 'text' || mode === 'ownText';
  const accepts = (found: Element) =>
    found === target ||
    (textLike && found.contains(target) && normalizeText(found.textContent) === targetText);

  const css = cssCandidates(target, root);
  const labels = labelCandidates(target, root, accepts).slice(0, 2);

  // Identifying attributes first, then labels, then structure
  const stable = css.filter(candidate => !candidate.selector.includes(':nth-child') && !candidate.selector.includes(' '));
  const structural = css.filter(candidate => !stable.includes(candidate));

  return [...stable, ...labels, ...structural].slice(0, MAX_CANDIDATES);
}

// Tags only (maybe with parents) match every such row on the page, which is rarely what the user means
const isBareTag = (selector: string) => !/[[.#]/.test(selector);

export type RowCandidate = Readonly<{
  candidate: CssCandidate;
  count: number;
}>;

// Selectors for a repeating row: they match the picked row and ideally its siblings too
export function generateRowSelectors(target: Element, root: Root): RowCandidate[] {
  const tag = target.tagName.toLowerCase();
  const parent = target.parentElement;
  const selectors: string[] = [];

  // An attribute that differs between the sibling rows (an id, a counter) would match only one row
  const siblings = parent ? [...parent.children].filter(sibling => sibling.tagName === target.tagName) : [];
  const attributes = [...target.attributes]
    .filter(({ name, value }) => !['id', 'class', 'style', 'href', 'src', 'title', 'value'].includes(name) && value && value.length < 80)
    .filter(({ name, value }) => siblings.every(sibling => sibling.getAttribute(name) === value))
    .map(({ name, value }) => `${tag}[${name}="${escapeAttribute(value)}"]`);

  const parts = simpleParts(target).map(part => part.selector);
  const parentParts = parent ? simpleParts(parent).map(part => part.selector) : [];

  selectors.push(...attributes, ...parts);
  parentParts.forEach(parentPart => {
    selectors.push(`${parentPart} > ${tag}`);
    parts.forEach(part => selectors.push(`${parentPart} > ${part}`));
  });

  return [...new Set(selectors)]
    .map(selector => ({ selector, found: queryAll(root, selector) }))
    .filter(({ found }) => found.includes(target))
    .map(({ selector, found }) => ({ candidate: { kind: 'css', selector } as CssCandidate, count: found.length }))
    .sort(
      (a, b) =>
        Number(isBareTag(a.candidate.selector)) - Number(isBareTag(b.candidate.selector)) ||
        Number(b.count > 1) - Number(a.count > 1) ||
        a.candidate.selector.length - b.candidate.selector.length,
    )
    .slice(0, MAX_CANDIDATES);
}

// What the locator reads with the given mode, to show next to the candidates
export function previewCandidate(root: Root, candidate: LocatorCandidate, mode: ExtractMode, attr?: string): string | undefined {
  const element = resolveCandidate(root, candidate)[0];
  return element ? readElement(element, mode, attr) : undefined;
}
