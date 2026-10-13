/** @jest-environment jsdom */
import fs from 'fs';
import path from 'path';
import { parseOrder, parsePrice } from '../content/events/parse-order';

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'orders');
const fixtures = fs.readdirSync(FIXTURES_DIR).filter(file => file.endsWith('.html'));

test.each(fixtures)('parses %s', (file) => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8');
  const expectedFile = path.join(FIXTURES_DIR, file.replace(/\.html$/, '.expected.json'));
  const expected = JSON.parse(fs.readFileSync(expectedFile, 'utf8'));
  const doc = new DOMParser().parseFromString(html, 'text/html');

  expect(parseOrder(doc)).toEqual(expected);
});

describe('page variations', () => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, 'cod-single-item.html'), 'utf8');
  const loadFixture = () => new DOMParser().parseFromString(html, 'text/html');
  const form = (doc: Document) => doc.getElementsByTagName('form')[0];
  const findSubheader = (doc: Document, text: string) =>
    [...form(doc).querySelectorAll('p.se-subheader')].find(p => p.textContent?.trim() === text)!;

  test('a missing field does not shift the others', () => {
    const doc = loadFixture();
    findSubheader(doc, 'Email').parentElement!.remove();

    const { delivery } = parseOrder(doc);
    expect(delivery.email).toBeUndefined();
    expect(delivery.name).toBe('Джон Сноу');
    expect(delivery.phone).toBe('+380123456789');
  });

  test('reads a filled-in TTN', () => {
    const doc = loadFixture();
    const ttnValue = [...form(doc).querySelectorAll('p')].find(p => p.textContent === 'Не вказаний')!;
    ttnValue.innerHTML = '<a href="#">20450011112222</a>';

    expect(parseOrder(doc).delivery.ttn).toBe('20450011112222');
  });

  test('parses prices with a thousands separator', () => {
    const doc = loadFixture();
    const total = [...form(doc).querySelectorAll('b')].find(b => b.textContent === 'Всього:')!;
    total.closest('div')!.lastElementChild!.textContent = '1\u00a0990,50 ₴';

    expect(parseOrder(doc).totalPrice).toBe(1990.5);
  });

  test('throws on a page without an order', () => {
    expect(() => parseOrder(new DOMParser().parseFromString('<p>Hello</p>', 'text/html'))).toThrow('Order form is not found');
  });
});

test('parsePrice', () => {
  expect(parsePrice('1990,00 ₴')).toBe(1990);
  expect(parsePrice('1 250,50 ₴')).toBe(1250.5);
  expect(parsePrice('')).toBeUndefined();
  expect(parsePrice(undefined)).toBeUndefined();
});
