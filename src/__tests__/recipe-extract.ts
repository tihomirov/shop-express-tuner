/** @jest-environment jsdom */
import fs from 'fs';
import path from 'path';
import { createShopExpressRecipe } from '../recipe/builtin-shop-express';
import { extractRecipe } from '../recipe/extract';
import { buildTable, planAction, renderText } from '../recipe/outputs';
import { MessageOutput, Recipe, TableOutput } from '../recipe/types';

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'orders');
const NOW = new Date(2026, 2, 5);

const recipe = createShopExpressRecipe();
const loadFixture = (file = 'cod-single-item.html') =>
  new DOMParser().parseFromString(fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8'), 'text/html');

const fixtures = fs.readdirSync(FIXTURES_DIR).filter(file => file.endsWith('.html'));

// The .expected.json files describe the order as the page shows it
test.each(fixtures)('extracts %s with the built-in recipe', file => {
  const expected = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file.replace(/\.html$/, '.expected.json')), 'utf8'));
  const result = extractRecipe(recipe, loadFixture(file), NOW);

  expect(result.missing).toEqual([]);
  expect(result.values).toMatchObject({
    orderId: expected.id,
    clientName: expected.client.name,
    clientPhone: expected.client.phone,
    clientEmail: expected.client.email,
    deliveryType: expected.delivery.type,
    address: expected.delivery.address,
    ttn: expected.delivery.ttn,
    fullName: expected.delivery.name,
    email: expected.delivery.email,
    phone: expected.delivery.phone,
    paymentMethod: expected.delivery.paymentMethod,
    paymentStatus: expected.delivery.paymentStatus,
    total: String(expected.totalPrice),
    today: '05.03.2026',
  });
  expect(result.collections.items).toMatchObject(
    expected.items.map((item: Record<string, unknown>) => ({
      name: item.name,
      params: item.params,
      quantity: String(item.quantity),
      price: String(item.price),
      actualPrice: String(item.actualPrice),
      totalPrice: String(item.totalPrice),
    })),
  );
});

describe('page variations', () => {
  const form = (doc: Document) => doc.getElementsByTagName('form')[0];
  const findSubheader = (doc: Document, text: string) =>
    [...form(doc).querySelectorAll('p.se-subheader')].find(p => p.textContent?.trim() === text)!;

  test('a missing field does not shift the others', () => {
    const doc = loadFixture();
    findSubheader(doc, 'Email').parentElement!.remove();

    const { values, missing } = extractRecipe(recipe, doc, NOW);
    expect(values.email).toBe('');
    expect(missing).toContain('email');
    expect(values.fullName).toBe('Джон Сноу');
    expect(values.phone).toBe('+380123456789');
  });

  test('reads a filled-in TTN', () => {
    const doc = loadFixture();
    const ttnValue = [...form(doc).querySelectorAll('p')].find(p => p.textContent === 'Не вказаний')!;
    ttnValue.innerHTML = '<a href="#">20450011112222</a>';

    expect(extractRecipe(recipe, doc, NOW).values.ttn).toBe('20450011112222');
  });

  test('parses prices with a thousands separator', () => {
    const doc = loadFixture();
    const total = [...form(doc).querySelectorAll('b')].find(b => b.textContent === 'Всього:')!;
    total.closest('div')!.lastElementChild!.textContent = '1\u00a0990,50 ₴';

    expect(extractRecipe(recipe, doc, NOW).values.total).toBe('1990.5');
  });

  test('reports every field of a page without an order as missing', () => {
    const doc = new DOMParser().parseFromString('<p>Hello</p>', 'text/html');
    const { missing, collections } = extractRecipe(recipe, doc, NOW);

    expect(missing).toContain('ttn');
    expect(missing).toContain('items');
    expect(collections.items).toEqual([]);
  });
});

describe('computed fields', () => {
  const { values, collections } = extractRecipe(recipe, loadFixture(), NOW);

  test('splits and normalizes the record values', () => {
    expect(values).toMatchObject({
      firstName: 'Сноу',
      lastName: 'Джон',
      city: 'Хмельницький',
      phoneShort: '0123456789',
      paymentKind: 'cashOnDelivery',
      paymentType: 'Накладений',
      received: '',
    });
  });

  test('derives item values', () => {
    expect(collections.items[0]).toMatchObject({ shortName: 'ПСЧ', size: 'xl', color: 'Чорний', discount: '' });
  });

  test('card payments get the commission subtracted', () => {
    const card: Recipe = { ...recipe, constants: { cardCommission: '1.3' } };
    const doc = loadFixture();
    [...doc.querySelectorAll('md-select-value')].forEach(el => (el.textContent = 'Оплата картами'));

    expect(extractRecipe(card, doc, NOW).values).toMatchObject({ paymentType: 'Сайт', received: '1964.13' });
  });
});

describe('outputs', () => {
  const result = extractRecipe(recipe, loadFixture(), NOW);
  const table = recipe.outputs.find((output): output is TableOutput => output.type === 'table')!;

  test('renders the message template', () => {
    expect(renderText('{lastName} {ttn} {unknown}!', result.values, recipe)).toBe('Джон Не вказаний !');
  });

  test('builds a table with spanned record cells', () => {
    const model = buildTable(table, result, recipe);

    expect(model).toHaveLength(1);
    expect(model[0].map(cell => cell.text)).toEqual([
      'Джон Сноу', 'Не вказаний', '05.03.2026', 'Накладений', 'Сайт', '1990', '', '', '', '',
      '0123456789', 'jonsnow@gmail.com', 'Хмельницький', 'ПСЧ', 'Чорний', 'xl', 'ч',
    ]);
  });

  test('repeats a row by quantity', () => {
    const doubled = { ...result, collections: { items: [{ ...result.collections.items[0], quantity: '2' }] } };
    const model = buildTable(table, doubled, recipe);

    expect(model).toHaveLength(2);
    expect(model[0][0].rowSpan).toBe(2);
    // The record cells are only in the first row
    expect(model[1]).toHaveLength(5);
  });

  test('plans the Telegram action with the message text', () => {
    const message = recipe.outputs.find((output): output is MessageOutput => output.type === 'message')!;
    const telegram = message.actions[1];
    const plan = planAction(telegram, result.values, recipe, 'Hi there');

    expect(plan).toEqual({ copy: 'Hi there', open: 'https://t.me/+380123456789?text=Hi%20there&profile' });
  });

  test('refuses unsafe URLs', () => {
    const action = { id: 'x', label: 'x', kind: 'open' as const, url: 'javascript:alert(1)' };
    expect(planAction(action, result.values, recipe).open).toBeUndefined();
  });
});
