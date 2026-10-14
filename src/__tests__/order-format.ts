import {
  DEFAULT_ORDER_FORMAT,
  expandItemsByQuantity,
  formatDate,
  formatPhone,
  getCity,
  getItemColor,
  getItemDiscount,
  getItemShortName,
  getItemSize,
  getPaymentType,
  getPaymentTypeLabel,
  getReceivedPayment,
  OrderFormatSettings,
} from '../common/order-format';

const config = DEFAULT_ORDER_FORMAT;

test('getCity takes the trimmed second address part', () => {
  expect(getCity('Україна, Хмельницький, Відділення №777')).toBe('Хмельницький');
  expect(getCity('Україна')).toBeUndefined();
  expect(getCity(undefined)).toBeUndefined();
});

test('formatPhone drops the country code', () => {
  expect(formatPhone('+380123456789')).toBe('0123456789');
  expect(formatPhone('380123456789')).toBe('0123456789');
  expect(formatPhone('0123456789')).toBe('0123456789');
});

test('formatDate is dd.mm.yyyy', () => {
  expect(formatDate(new Date(2026, 0, 5))).toBe('05.01.2026');
});

test('getPaymentType maps payment methods', () => {
  expect(getPaymentType('Накладений платіж (оплата при отриманні)', config)).toBe('cashOnDelivery');
  expect(getPaymentType('Оплата картами Visa/Mastercard', config)).toBe('card');
  expect(getPaymentType('Something else', config)).toBeUndefined();
  expect(getPaymentType(undefined, config)).toBeUndefined();
});

test('getPaymentTypeLabel uses the configured labels', () => {
  expect(getPaymentTypeLabel('cashOnDelivery', config)).toBe('Накладений');
  expect(getPaymentTypeLabel('card', config)).toBe('Сайт');
  expect(getPaymentTypeLabel(undefined, config)).toBeUndefined();
  expect(getPaymentTypeLabel('card', { ...config, paymentTypes: { ...config.paymentTypes, card: 'Карта' } })).toBe('Карта');
});

test('getReceivedPayment subtracts card commission only for card payments', () => {
  expect(getReceivedPayment(1000, 'card', config)).toBe('987');
  expect(getReceivedPayment(1990, 'card', config)).toBe('1964.13');
  expect(getReceivedPayment(1990, 'cashOnDelivery', config)).toBe('');
  expect(getReceivedPayment(undefined, 'card', config)).toBe('');
});

test('getReceivedPayment uses the configured commission', () => {
  expect(getReceivedPayment(1000, 'card', { ...config, cardCommissionPercent: 2.5 })).toBe('975');
  expect(getReceivedPayment(1990, 'card', { ...config, cardCommissionPercent: 0 })).toBe('1990');
});

test('getItemShortName', () => {
  expect(getItemShortName('Шовковиста нічна сорочка зі шнурівкою', config)).toBe('ПСЧ');
  expect(getItemShortName('Лонгслів оверсайз', config)).toBe('Лонгслів');
  expect(getItemShortName('Unknown', config)).toBe('');
  expect(getItemShortName(undefined, config)).toBe('');
});

test('getItemShortName supports every match mode and takes the first matching rule', () => {
  const custom: OrderFormatSettings = {
    ...config,
    itemShortNames: [
      { match: 'equals', name: 'Сукня', shortName: 'Exact' },
      { match: 'startsWith', name: 'Сукня', shortName: 'Prefix' },
      { match: 'contains', name: 'шовк', shortName: 'Silk' },
    ],
  };
  expect(getItemShortName('Сукня', custom)).toBe('Exact');
  expect(getItemShortName('Сукня міді', custom)).toBe('Prefix');
  expect(getItemShortName('Піжама шовкова', custom)).toBe('Silk');
  expect(getItemShortName('Комбінезон', custom)).toBe('');
});

test('item size and color are read by label, in any order', () => {
  expect(getItemSize({ params: 'Розмір: XL, Колір: Чорний' })).toBe('xl');
  expect(getItemColor({ params: 'Розмір: XL, Колір: Чорний' })).toBe('Чорний');
  expect(getItemSize({ params: 'Колір: Чорний, Розмір: XL' })).toBe('xl');
  expect(getItemColor({ params: 'Колір: Чорний, Розмір: XL' })).toBe('Чорний');
  expect(getItemSize({})).toBeUndefined();
});

test('getItemDiscount', () => {
  expect(getItemDiscount({ price: 2000, actualPrice: 1800 })).toBe('10%');
  expect(getItemDiscount({ price: 1990, actualPrice: 1990 })).toBe('');
});

test('expandItemsByQuantity repeats items and tolerates bad quantities', () => {
  const item = { name: 'A' };
  expect(expandItemsByQuantity([{ ...item, quantity: 2 }])).toHaveLength(2);
  expect(expandItemsByQuantity([{ ...item, quantity: undefined }])).toHaveLength(1);
  expect(expandItemsByQuantity([{ ...item, quantity: NaN }])).toHaveLength(1);
  expect(expandItemsByQuantity([{ ...item, quantity: 0 }])).toHaveLength(1);
});
