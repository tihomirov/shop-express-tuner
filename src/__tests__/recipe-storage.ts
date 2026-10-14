import { createShopExpressRecipe, DEFAULT_LEGACY_SETTINGS } from '../recipe/builtin-shop-express';
import { recomputeResult } from '../recipe/extract';
import { findRecipes, matchesUrl, suggestMatchPattern } from '../recipe/matching';
import { createEmptyRecipe, normalizeRecipe, normalizeRecipes } from '../recipe/normalize';
import { renderText } from '../recipe/outputs';
import { suggestKey, validateKey } from '../recipe/describe';
import { readLegacySettings } from '../recipe/legacy-settings';

describe('matchesUrl', () => {
  test('star matches anything', () => {
    expect(matchesUrl('*', 'https://a.com/x?y=1')).toBe(true);
    expect(matchesUrl('https://admin.shop.com/orders/*', 'https://admin.shop.com/orders/77')).toBe(true);
    expect(matchesUrl('https://*.shop.com/*', 'https://admin.shop.com/orders')).toBe(true);
  });

  test('must match the whole address, ignoring case', () => {
    expect(matchesUrl('https://shop.com/orders', 'https://shop.com/orders/1')).toBe(false);
    expect(matchesUrl('HTTPS://SHOP.COM/*', 'https://shop.com/a')).toBe(true);
  });

  test('regex characters in a pattern are plain text', () => {
    expect(matchesUrl('https://shop.com/a.b?c=1', 'https://shop.com/a.b?c=1')).toBe(true);
    expect(matchesUrl('https://shop.com/a.b', 'https://shop.com/aXb')).toBe(false);
  });

  test('finds the recipes of a page', () => {
    const one = { ...createEmptyRecipe('one', ['https://a.com/*']) };
    const two = { ...createEmptyRecipe('two', ['https://b.com/*']) };
    expect(findRecipes([one, two], 'https://b.com/x')).toEqual([two]);
  });

  test('suggests the site as a pattern', () => {
    expect(suggestMatchPattern('https://admin.shop.com/orders/7?x=1')).toBe('https://admin.shop.com/*');
    expect(suggestMatchPattern('nonsense')).toBe('*');
  });
});

describe('normalizeRecipe', () => {
  test('keeps a valid recipe as it is', () => {
    const recipe = createShopExpressRecipe();
    expect(normalizeRecipe(JSON.parse(JSON.stringify(recipe)))).toEqual(JSON.parse(JSON.stringify(recipe)));
  });

  test('drops malformed parts and fills defaults', () => {
    const recipe = normalizeRecipe({
      id: 'x',
      fields: [{ key: 'a', locator: [{ kind: 'css', selector: 'p' }, { kind: 'nope' }, 5], extract: 'bogus' }, { nokey: true }, 'str'],
      outputs: [{ type: 'message', template: 5 }, { type: 'unknown' }, { type: 'table', columns: [{ template: 'x', scope: 'row' }, { scope: 'bad' }] }],
      match: ['*', 5],
      constants: { a: '1', b: 2 },
      tables: [{ name: 't', rules: [{ match: 'weird', pattern: 'p', value: 'v' }, { pattern: 1 }] }],
    });

    expect(recipe).toMatchObject({
      id: 'x',
      name: 'Untitled recipe',
      match: ['*'],
      constants: { a: '1' },
      fields: [{ key: 'a', locator: [{ kind: 'css', selector: 'p' }], extract: 'text' }],
      tables: [{ name: 't', rules: [{ match: 'equals', pattern: 'p', value: 'v' }] }],
    });
    expect(recipe?.outputs).toHaveLength(2);
    expect(recipe?.outputs[0]).toMatchObject({ type: 'message', template: '' });
    expect(recipe?.outputs[1]).toMatchObject({ type: 'table', columns: [{ template: 'x', scope: 'row' }, { template: '', scope: 'record' }] });
  });

  test('rejects things that are not recipes', () => {
    expect(normalizeRecipe(null)).toBeUndefined();
    expect(normalizeRecipe({ name: 'no id' })).toBeUndefined();
    expect(normalizeRecipes('nope')).toEqual([]);
  });
});

describe('legacy settings', () => {
  test('defaults when nothing was saved', () => {
    expect(readLegacySettings(undefined)).toEqual(DEFAULT_LEGACY_SETTINGS);
    expect(readLegacySettings('garbage')).toEqual(DEFAULT_LEGACY_SETTINGS);
  });

  test('keeps what the old options page saved, and defaults for the rest', () => {
    const settings = readLegacySettings({
      message: { template: 'Hi {firstName}' },
      orderFormat: {
        cardCommissionPercent: 2,
        paymentTypes: { card: 'Card' },
        itemShortNames: [{ match: 'equals', name: 'Dress', shortName: 'D' }, { bad: true }],
      },
    });

    expect(settings.messageTemplate).toBe('Hi {firstName}');
    expect(settings.cardCommissionPercent).toBe(2);
    expect(settings.paymentTypes).toEqual({ cashOnDelivery: 'Накладений', card: 'Card' });
    expect(settings.itemShortNames).toEqual([{ match: 'equals', name: 'Dress', shortName: 'D' }]);
  });

  test('become part of the built-in recipe', () => {
    const recipe = createShopExpressRecipe({ ...DEFAULT_LEGACY_SETTINGS, cardCommissionPercent: 2, messageTemplate: 'Hello' });

    expect(recipe.constants.cardCommission).toBe('2');
    expect(recipe.outputs[0]).toMatchObject({ template: 'Hello' });
    expect(recipe.tables.find(table => table.name === 'shortNames')?.rules).toHaveLength(DEFAULT_LEGACY_SETTINGS.itemShortNames.length);
  });
});

describe('recomputeResult', () => {
  const recipe = createShopExpressRecipe();
  const previous = {
    values: { fullName: 'Коваленко Марія', phone: '+380671112233', address: 'Україна, Львів, №5', total: '990', paymentMethod: 'Оплата картами' },
    collections: { items: [{ name: 'Комбінезон', prices: '1000 ₴ 900 ₴', params: 'Розмір: S, Колір: Білий', quantity: '2', totalPrice: '1800' }] },
    missing: [],
  };

  test('applies an edited recipe to values read earlier', () => {
    const edited = { ...recipe, computed: [...recipe.computed, { key: 'greeting', template: 'Hi {firstName}!' }] };
    const result = recomputeResult(edited, previous, new Date(2026, 0, 2));

    expect(result.values).toMatchObject({ firstName: 'Марія', city: 'Львів', greeting: 'Hi Марія!', today: '02.01.2026', received: '977.13' });
    expect(result.collections.items[0]).toMatchObject({ price: '1000', actualPrice: '900', discount: '10%', shortName: 'Комбінезон', size: 's' });
  });

  test('renders text with the recomputed values', () => {
    const result = recomputeResult(recipe, previous);
    expect(renderText('{city}/{received}', result.values, recipe)).toBe('Львів/977.13');
  });
});

describe('field names', () => {
  test('validateKey', () => {
    expect(validateKey('phone', [])).toBeUndefined();
    expect(validateKey('Ім_я2', [])).toBeUndefined();
    expect(validateKey('', [])).toBeDefined();
    expect(validateKey('1a', [])).toBeDefined();
    expect(validateKey('a b', [])).toBeDefined();
    expect(validateKey('a.b', [])).toBeDefined();
    expect(validateKey('phone', ['phone'])).toMatch(/already used/);
  });

  test('suggestKey', () => {
    expect(suggestKey('Phone number', [])).toBe('phoneNumber');
    expect(suggestKey('Телефон', [])).toBe('field');
    expect(suggestKey('Телефон', ['field'])).toBe('field2');
    expect(suggestKey(undefined, [])).toBe('field');
    expect(suggestKey('Email', ['email'])).toBe('email2');
  });
});
