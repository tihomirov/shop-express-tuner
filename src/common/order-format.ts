import { Item } from '../types/item';

export type PaymentTypeKey = 'cashOnDelivery' | 'card';

export const PAYMENT_TYPE_KEYS: ReadonlyArray<PaymentTypeKey> = ['cashOnDelivery', 'card'];

export type ItemNameMatch = 'equals' | 'startsWith' | 'contains';

export const ITEM_NAME_MATCHES: ReadonlyArray<ItemNameMatch> = ['equals', 'startsWith', 'contains'];

export type PaymentMethodRule = Readonly<{
  method: string;
  type: PaymentTypeKey;
}>;

export type ItemShortNameRule = Readonly<{
  match: ItemNameMatch;
  name: string;
  shortName: string;
}>;

export type OrderFormatSettings = Readonly<{
  // Percent, e.g. 1.3 for 1.3%
  cardCommissionPercent: number;
  paymentTypes: Readonly<Record<PaymentTypeKey, string>>;
  paymentMethodRules: ReadonlyArray<PaymentMethodRule>;
  itemShortNames: ReadonlyArray<ItemShortNameRule>;
}>;

export const DEFAULT_ORDER_FORMAT: OrderFormatSettings = {
  cardCommissionPercent: 1.3,
  paymentTypes: {
    cashOnDelivery: 'Накладений',
    card: 'Сайт',
  },
  paymentMethodRules: [
    { method: 'Накладений платіж', type: 'cashOnDelivery' },
    { method: 'Оплата картами', type: 'card' },
  ],
  itemShortNames: [
    { match: 'equals', name: 'Шовковиста нічна сорочка зі шнурівкою', shortName: 'ПСЧ' },
    { match: 'equals', name: 'Довга сукня з мереживними вставками', shortName: 'СукМаксі' },
    { match: 'equals', name: 'Комбінезон', shortName: 'Комбінезон' },
    { match: 'startsWith', name: 'Лонгслів', shortName: 'Лонгслів' },
  ],
};

// Address comes from the page as "<country>, <city>, <branch>"
export const getCity = (address?: string) => address?.split(',')[1]?.trim();

export const formatPhone = (phone?: string) => phone?.replace(/^\+?38/, '');

export const formatDate = (date: Date) =>
  [date.getDate(), date.getMonth() + 1].map(part => String(part).padStart(2, '0')).join('.') + `.${date.getFullYear()}`;

export const getPaymentType = (paymentMethod: string | undefined, config: OrderFormatSettings) =>
  paymentMethod ? config.paymentMethodRules.find(({ method }) => paymentMethod.includes(method))?.type : undefined;

export const getPaymentTypeLabel = (type: PaymentTypeKey | undefined, config: OrderFormatSettings) =>
  type ? config.paymentTypes[type] : undefined;

// Card payments arrive minus the payment provider commission
export function getReceivedPayment(
  totalPrice: number | undefined,
  paymentType: PaymentTypeKey | undefined,
  config: OrderFormatSettings,
): string {
  if (paymentType !== 'card' || totalPrice === undefined) {
    return '';
  }
  // Percent math and rounding to cents keep float noise like 1964.1299999 out of the result
  const received = Math.round(totalPrice * (100 - config.cardCommissionPercent)) / 100;
  return Number.isInteger(received) ? String(received) : received.toFixed(2);
}

const ITEM_NAME_MATCHERS: Readonly<Record<ItemNameMatch, (name: string, pattern: string) => boolean>> = {
  equals: (name, pattern) => name === pattern,
  startsWith: (name, pattern) => name.startsWith(pattern),
  contains: (name, pattern) => name.includes(pattern),
};

// The first matching rule wins
export const getItemShortName = (name: string | undefined, config: OrderFormatSettings) =>
  (name && config.itemShortNames.find(rule => ITEM_NAME_MATCHERS[rule.match](name, rule.name))?.shortName) || '';

// Params come from the page as "Розмір: XL, Колір: Чорний"
function getItemParam(item: Item, label: string, fallbackIndex: number): string | undefined {
  const params = item.params?.split(',').map(param => param.split(':').map(part => part.trim())) ?? [];
  return (params.find(([name]) => name === label) ?? params[fallbackIndex])?.[1];
}

export const getItemSize = (item: Item) => getItemParam(item, 'Розмір', 0)?.toLowerCase();

export const getItemColor = (item: Item) => getItemParam(item, 'Колір', 1);

export function getItemDiscount(item: Item): string {
  if (item.actualPrice && item.price && item.actualPrice !== item.price) {
    return `${100 - Math.round((item.actualPrice / item.price) * 100)}%`;
  }
  return '';
}

// One entry per physical item, so an item with quantity 2 takes two table rows
export const expandItemsByQuantity = (items: ReadonlyArray<Item>): Item[] =>
  items.flatMap(item => Array<Item>(Math.max(1, Math.floor(item.quantity || 1))).fill(item));
