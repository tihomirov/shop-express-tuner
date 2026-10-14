import { CssCandidate, ExtractMode, LabelCandidate, Locator, LocatorCandidate, Within } from './types';

export type Root = Document | Element;

// Like innerText (whitespace collapsed), but also works in jsdom which has no innerText
export const normalizeText = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

function safeQueryAll(root: Root, selector: string): Element[] {
  try {
    return [...root.querySelectorAll(selector)];
  } catch {
    // An invalid selector must not break the other fields
    return [];
  }
}

// Elements whose whole text equals `text`; of nested matches only the innermost is kept
function findByText(root: Root, selector: string | undefined, text: string): Element[] {
  const matches = safeQueryAll(root, selector || '*').filter(element => normalizeText(element.textContent) === text);
  return matches.filter(element => !matches.some(other => other !== element && element.contains(other)));
}

function resolveWithin(root: Root, within: Within | undefined): Root | undefined {
  if (!within) {
    return root;
  }
  return findByText(root, within.selector, within.text)[0]?.parentElement ?? undefined;
}

// The element that follows the label: its next sibling matching `valueSelector`,
// or the first following sibling with text, looking at the label and then at its parents
function findValueAfter(label: Element, valueSelector: string | undefined, scope: Root): Element | null {
  if (valueSelector) {
    for (let sibling = label.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
      if (sibling.matches(valueSelector)) {
        return sibling;
      }
    }
    return null;
  }

  let element: Element | null = label;
  for (let depth = 0; element && element !== scope && depth < 5; depth++, element = element.parentElement) {
    for (let sibling = element.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
      if (normalizeText(sibling.textContent)) {
        return sibling;
      }
    }
  }
  return null;
}

function resolveCss(root: Root, { selector, within }: CssCandidate): Element[] {
  const scope = resolveWithin(root, within);
  return scope ? safeQueryAll(scope, selector) : [];
}

function resolveLabel(root: Root, { label, labelSelector, valueSelector, within }: LabelCandidate): Element[] {
  const scope = resolveWithin(root, within);
  const labelElement = scope && findByText(scope, labelSelector, label)[0];
  const value = labelElement && findValueAfter(labelElement, valueSelector, scope);
  return value ? [value] : [];
}

export function resolveCandidate(root: Root, candidate: LocatorCandidate): Element[] {
  return candidate.kind === 'css' ? resolveCss(root, candidate) : resolveLabel(root, candidate);
}

// All elements found by the first candidate that finds any, with the index of that candidate
export function resolveLocatorAll(root: Root, locator: Locator): { elements: Element[]; candidateIndex: number } {
  for (let candidateIndex = 0; candidateIndex < locator.length; candidateIndex++) {
    const elements = resolveCandidate(root, locator[candidateIndex]);
    if (elements.length > 0) {
      return { elements, candidateIndex };
    }
  }
  return { elements: [], candidateIndex: -1 };
}

export const resolveLocator = (root: Root, locator: Locator): Element | undefined =>
  resolveLocatorAll(root, locator).elements[0];

export function readElement(element: Element, mode: ExtractMode, attr?: string): string {
  switch (mode) {
    case 'value': {
      const value = (element as HTMLInputElement).value;
      return value !== undefined ? String(value) : (element.getAttribute('value') ?? '');
    }
    case 'attr':
      return element.getAttribute(attr ?? '') ?? '';
    case 'html':
      return element.innerHTML.trim();
    case 'ownText':
      return normalizeText(
        [...element.childNodes]
          .filter(node => node.nodeType === 3)
          .map(node => node.textContent)
          .join(' '),
      );
    case 'text':
    default: {
      // Inputs have no text, their content is the value
      const tag = element.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return readElement(element, 'value');
      }
      return normalizeText(element.textContent);
    }
  }
}
