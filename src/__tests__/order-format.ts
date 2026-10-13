import {
  expandItemsByQuantity,
  formatDate,
  formatPhone,
  getCity,
  getItemColor,
  getItemDiscount,
  getItemShortName,
  getItemSize,
  getPaymentType,
  getReceivedPayment,
  PAYMENT_TYPES,
} from '../common/order-format';

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
  expect(getPaymentType('Накладений платіж (оплата при отриманні)')).toBe(PAYMENT_TYPES.cashOnDelivery);
  expect(getPaymentType('Оплата картами Visa/Mastercard')).toBe(PAYMENT_TYPES.card);
  expect(getPaymentType('Something else')).toBeUndefined();
});

test('getReceivedPayment subtracts card commission only for card payments', () => {
  expect(getReceivedPayment(1000, PAYMENT_TYPES.card)).toBe('987');
  expect(getReceivedPayment(1990, PAYMENT_TYPES.card)).toBe('1964.13');
  expect(getReceivedPayment(1990, PAYMENT_TYPES.cashOnDelivery)).toBe('');
  expect(getReceivedPayment(undefined, PAYMENT_TYPES.card)).toBe('');
});

test('getItemShortName', () => {
  expect(getItemShortName('Шовковиста нічна сорочка зі шнурівкою')).toBe('ПСЧ');
  expect(getItemShortName('Лонгслів оверсайз')).toBe('Лонгслів');
  expect(getItemShortName('Unknown')).toBe('');
  expect(getItemShortName(undefined)).toBe('');
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
