import { isSafeUrl } from './outputs';

// Formatting a message may keep; other elements are replaced by their content
const ALLOWED_TAGS = new Set([
  'A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'DEL', 'CODE', 'PRE', 'BR', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
]);
// Elements removed together with their content
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'HEAD', 'TITLE', 'META', 'LINK']);
const BLOCK_TAGS = new Set(['P', 'DIV', 'PRE', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);

function cleanChildren(parent: Node) {
  for (const node of [...parent.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      continue;
    }
    if (!(node instanceof Element)) {
      node.parentNode?.removeChild(node);
      continue;
    }
    const tag = node.tagName.toUpperCase();
    if (DROPPED_TAGS.has(tag)) {
      node.remove();
      continue;
    }
    cleanChildren(node);
    if (!ALLOWED_TAGS.has(tag)) {
      node.replaceWith(...node.childNodes);
      continue;
    }
    for (const { name, value } of [...node.attributes]) {
      if (!(tag === 'A' && name === 'href' && isSafeUrl(value))) {
        node.removeAttribute(name);
      }
    }
    if (tag === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  }
}

// Keeps only simple formatting and links with safe URLs, so the HTML can be shown on any page
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  cleanChildren(doc.body);
  return doc.body.innerHTML;
}

function appendText(node: Node, out: string[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    out.push(node.textContent ?? '');
    return;
  }
  if (!(node instanceof Element)) {
    return;
  }
  const tag = node.tagName.toUpperCase();
  if (tag === 'BR') {
    out.push('\n');
    return;
  }
  const block = BLOCK_TAGS.has(tag);
  if (block && out.length > 0 && !out[out.length - 1].endsWith('\n')) {
    out.push('\n');
  }
  node.childNodes.forEach(child => appendText(child, out));
  if (block && out.length > 0 && !out[out.length - 1].endsWith('\n')) {
    out.push('\n');
  }
}

// The text of the HTML as it reads, with line breaks; links keep only their text
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: string[] = [];
  appendText(doc.body, out);
  return out.join('').replace(/\n$/, '');
}
