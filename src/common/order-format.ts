import { Item } from '../types/item';

const CARD_COMMISSION = 0.013;

export const PAYMENT_TYPES = {
  cashOnDelivery: 'Накладений',
  card: 'Сайт',
} as const;

const PAYMENT_METHOD_TO_TYPE: ReadonlyArray<[method: string, type: string]> = [
  ['Накладений платіж', PAYMENT_TYPES.cashOnDelivery],
  ['Оплата картами', PAYMENT_TYPES.card],
];

const ITEM_SHORT_NAMES: ReadonlyArray<[match: (name: string) => boolean, shortName: string]> = [
  [name => name === 'Шовковиста нічна сорочка зі шнурівкою', 'ПСЧ'],
  [name => name === 'Довга сукня з мереживними вставками', 'СукМаксі'],
  [name => name === 'Комбінезон', 'Комбінезон'],
  [name => name.startsWith('Лонгслів'), 'Лонгслів'],
];

// Address comes from the page as "<country>, <city>, <branch>"
export const getCity = (address?: string) => address?.split(',')[1]?.trim();

export const formatPhone = (phone?: string) => phone?.replace(/^\+?38/, '');

export const formatDate = (date: Date) =>
  [date.getDate(), date.getMonth() + 1].map(part => String(part).padStart(2, '0')).join('.') + `.${date.getFullYear()}`;

export const getPaymentType = (paymentMethod?: string) =>
  PAYMENT_METHOD_TO_TYPE.find(([method]) => paymentMethod?.includes(method))?.[1];

// Card payments arrive minus the payment provider commission
export function getReceivedPayment(totalPrice: number | undefined, paymentType: string | undefined): string {
  if (paymentType !== PAYMENT_TYPES.card || totalPrice === undefined) {
    return '';
  }
  const received = totalPrice * (1 - CARD_COMMISSION);
  return Number.isInteger(received) ? String(received) : received.toFixed(2);
}

export const getItemShortName = (name?: string) =>
  (name && ITEM_SHORT_NAMES.find(([match]) => match(name))?.[1]) || '';

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
