import browser from 'webextension-polyfill';
import { arrayTypeguard, isEnum, isNonArrayObject, isNumber, isString, typeguard } from '../utils/is-it';
import {
  DEFAULT_ORDER_FORMAT,
  ITEM_NAME_MATCHES,
  ItemShortNameRule,
  OrderFormatSettings,
  PAYMENT_TYPE_KEYS,
  PaymentMethodRule,
} from '../common/order-format';

export type MessageSettings = Readonly<{
  template: string;
}>;

export type Settings = Readonly<{
  message: MessageSettings;
  orderFormat: OrderFormatSettings;
}>;

export const DEFAULT_SETTINGS: Settings = {
  message: {
    template:
      '{firstName}, ваше замовлення укомплектоване та готове до відправки, номер ТТН {ttn}💌\n\nP/S Обережно! Бажання, загадані у цьому одязі, здійснюються💫',
  },
  orderFormat: DEFAULT_ORDER_FORMAT,
};

const STORAGE_KEY = 'settings';

const isPaymentTypeKey = (value: unknown) => PAYMENT_TYPE_KEYS.includes(value as never);
const isItemNameMatch = (value: unknown) => ITEM_NAME_MATCHES.includes(value as never);

const isPaymentMethodRules = arrayTypeguard(
  typeguard<PaymentMethodRule>(['method', isString], ['type', isPaymentTypeKey]),
);
const isItemShortNameRules = arrayTypeguard(
  typeguard<ItemShortNameRule>(['match', isItemNameMatch], ['name', isString], ['shortName', isString]),
);

const isPercent = (value: unknown): value is number => isNumber(value) && value >= 0 && value <= 100;

function normalizeMessage(value: unknown): MessageSettings {
  const message = isNonArrayObject(value) ? value : {};
  return {
    template: isString(message.template) ? message.template : DEFAULT_SETTINGS.message.template,
  };
}

function normalizeOrderFormat(value: unknown): OrderFormatSettings {
  const orderFormat = isNonArrayObject(value) ? value : {};
  const paymentTypes = isNonArrayObject(orderFormat.paymentTypes) ? orderFormat.paymentTypes : {};
  const defaults = DEFAULT_ORDER_FORMAT;

  return {
    cardCommissionPercent: isPercent(orderFormat.cardCommissionPercent)
      ? orderFormat.cardCommissionPercent
      : defaults.cardCommissionPercent,
    paymentTypes: {
      cashOnDelivery: isString(paymentTypes.cashOnDelivery)
        ? paymentTypes.cashOnDelivery
        : defaults.paymentTypes.cashOnDelivery,
      card: isString(paymentTypes.card) ? paymentTypes.card : defaults.paymentTypes.card,
    },
    paymentMethodRules: isPaymentMethodRules(orderFormat.paymentMethodRules)
      ? orderFormat.paymentMethodRules
      : defaults.paymentMethodRules,
    itemShortNames: isItemShortNameRules(orderFormat.itemShortNames)
      ? orderFormat.itemShortNames
      : defaults.itemShortNames,
  };
}

// Use defaults for anything missing or malformed, e.g. settings added in a newer version
export function normalizeSettings(value: unknown): Settings {
  const settings = isNonArrayObject(value) ? value : {};
  return {
    message: normalizeMessage(settings.message),
    orderFormat: normalizeOrderFormat(settings.orderFormat),
  };
}

// Drops half-filled rules before saving; an empty item name would otherwise match every item
export function cleanSettings(settings: Settings): Settings {
  const { orderFormat } = settings;
  return {
    ...settings,
    orderFormat: {
      ...orderFormat,
      paymentMethodRules: orderFormat.paymentMethodRules.filter(rule => rule.method.trim()),
      itemShortNames: orderFormat.itemShortNames.filter(rule => rule.name.trim() && rule.shortName.trim()),
    },
  };
}

// Returns an error to show instead of saving, if any
export function validateSettings(settings: Settings): string | undefined {
  if (!isPercent(settings.orderFormat.cardCommissionPercent)) {
    return 'Card commission must be a number from 0 to 100.';
  }
  return undefined;
}

export class SettingsService {
  static async get(): Promise<Settings> {
    const stored = await browser.storage.sync.get(STORAGE_KEY);
    return normalizeSettings(stored[STORAGE_KEY]);
  }

  static async save(settings: Settings): Promise<void> {
    await browser.storage.sync.set({ [STORAGE_KEY]: settings });
  }

  static async reset(): Promise<Settings> {
    await browser.storage.sync.remove(STORAGE_KEY);
    return DEFAULT_SETTINGS;
  }

  // Calls the listener with fresh settings whenever they are saved or reset; returns an unsubscribe function
  static subscribe(listener: (settings: Settings) => void): () => void {
    const onChanged = (changes: Record<string, browser.Storage.StorageChange>, areaName: string) => {
      if (areaName === 'sync' && STORAGE_KEY in changes) {
        listener(normalizeSettings(changes[STORAGE_KEY].newValue));
      }
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }
}
