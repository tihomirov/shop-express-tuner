/** @jest-environment jsdom */
import fs from 'fs';
import path from 'path';
import { resolveCandidate } from '../recipe/locator';
import { generateLocators, generateRowSelectors } from '../recipe/selector-generator';

const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'orders', 'cod-single-item.html'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');

const findText = (selector: string, text: string) =>
  [...doc.querySelectorAll(selector)].find(element => element.textContent?.trim() === text)!;

test('every generated locator finds the picked element', () => {
  const targets = [
    doc.querySelector('h1 span')!,
    findText('p', 'Не вказаний'),
    doc.querySelector('md-select[name="Payment"] md-select-value')!,
    doc.querySelector('a[href^="mailto:"]')!,
  ];

  for (const target of targets) {
    const locators = generateLocators(target, doc);
    expect(locators.length).toBeGreaterThan(0);
    for (const locator of locators) {
      const found = resolveCandidate(doc, locator)[0];
      expect(found === target || found.contains(target)).toBe(true);
    }
  }
});

test('offers a label locator for a labeled value', () => {
  const value = findText('p', 'Не вказаний');
  const locators = generateLocators(value, doc);

  expect(locators).toContainEqual(expect.objectContaining({ kind: 'label', label: 'Номер накладної (ТТН)' }));
});

test('finds the row selector of a repeated element', () => {
  const row = doc.querySelector('tr[ng-repeat]')!;
  const [best] = generateRowSelectors(row, doc);

  expect(best.candidate.selector).toContain('ng-repeat');
  expect(doc.querySelector(best.candidate.selector)).toBe(row);
});

test('generates locators relative to a row', () => {
  const row = doc.querySelector('tr[ng-repeat]')!;
  const quantity = row.querySelector('td:nth-child(4) input')!;
  const [first] = generateLocators(quantity, row, { mode: 'value' });

  expect(resolveCandidate(row, first)[0]).toBe(quantity);
});

test('an element without a good label still gets a unique path', () => {
  const button = doc.querySelector('button[ng-click="AddProducts()"]') ?? doc.querySelector('form button')!;
  const locators = generateLocators(button, doc);

  expect(locators.length).toBeGreaterThan(0);
  expect(resolveCandidate(doc, locators[0])[0]).toBe(button);
});
