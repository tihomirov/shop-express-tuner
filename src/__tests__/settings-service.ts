import { DEFAULT_ORDER_FORMAT } from '../common/order-format';
import { cleanSettings, DEFAULT_SETTINGS, normalizeSettings, validateSettings } from '../services/settings-service';

// The polyfill throws outside an extension; these tests only cover the pure helpers
jest.mock('webextension-polyfill', () => ({}));

test('normalizeSettings falls back to defaults for missing settings', () => {
  expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  expect(normalizeSettings({ message: { template: 'Hi' } })).toEqual({ ...DEFAULT_SETTINGS, message: { template: 'Hi' } });
});

test('normalizeSettings keeps valid order format values', () => {
  const orderFormat = {
    cardCommissionPercent: 2,
    paymentTypes: { cashOnDelivery: 'COD', card: 'Card' },
    paymentMethodRules: [{ method: 'Card', type: 'card' }],
    itemShortNames: [{ match: 'contains', name: 'Silk', shortName: 'S' }],
  };
  expect(normalizeSettings({ orderFormat }).orderFormat).toEqual(orderFormat);
});

test('normalizeSettings replaces each malformed order format part with its default', () => {
  const orderFormat = normalizeSettings({
    orderFormat: {
      cardCommissionPercent: ' 1.3',
      paymentTypes: { card: 'Card' },
      paymentMethodRules: [{ method: 'Card', type: 'crypto' }],
      itemShortNames: [{ match: 'equals', name: 'A' }],
    },
  }).orderFormat;

  expect(orderFormat).toEqual({
    ...DEFAULT_ORDER_FORMAT,
    paymentTypes: { ...DEFAULT_ORDER_FORMAT.paymentTypes, card: 'Card' },
  });
});

test('cleanSettings drops half-filled rules', () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    orderFormat: {
      ...DEFAULT_ORDER_FORMAT,
      paymentMethodRules: [{ method: ' ', type: 'card' as const }, { method: 'Card', type: 'card' as const }],
      itemShortNames: [
        { match: 'startsWith' as const, name: '', shortName: 'All' },
        { match: 'equals' as const, name: 'A', shortName: '' },
        { match: 'equals' as const, name: 'B', shortName: 'b' },
      ],
    },
  };
  const { orderFormat } = cleanSettings(settings);
  expect(orderFormat.paymentMethodRules).toEqual([{ method: 'Card', type: 'card' }]);
  expect(orderFormat.itemShortNames).toEqual([{ match: 'equals', name: 'B', shortName: 'b' }]);
});

test('validateSettings rejects an invalid commission', () => {
  const withCommission = (cardCommissionPercent: number) => ({
    ...DEFAULT_SETTINGS,
    orderFormat: { ...DEFAULT_ORDER_FORMAT, cardCommissionPercent },
  });
  expect(validateSettings(DEFAULT_SETTINGS)).toBeUndefined();
  expect(validateSettings(withCommission(NaN))).toBeDefined();
  expect(validateSettings(withCommission(-1))).toBeDefined();
  expect(validateSettings(withCommission(101))).toBeDefined();
});
