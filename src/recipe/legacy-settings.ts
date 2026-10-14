import { isNonArrayObject, isNumber, isString } from '../utils/is-it';
import { DEFAULT_LEGACY_SETTINGS, LegacySettings } from './builtin-shop-express';

// The settings of versions before recipes were kept in the sync storage; reuse them for the built-in recipe
export function readLegacySettings(stored: unknown): LegacySettings {
  const defaults = DEFAULT_LEGACY_SETTINGS;
  if (!isNonArrayObject(stored)) {
    return defaults;
  }

  const message = isNonArrayObject(stored.message) ? stored.message : {};
  const format = isNonArrayObject(stored.orderFormat) ? stored.orderFormat : {};
  const types = isNonArrayObject(format.paymentTypes) ? format.paymentTypes : {};

  const rules = Array.isArray(format.paymentMethodRules)
    ? format.paymentMethodRules.filter(
        (rule): rule is LegacySettings['paymentMethodRules'][number] =>
          isNonArrayObject(rule) && isString(rule.method) && (rule.type === 'card' || rule.type === 'cashOnDelivery'),
      )
    : defaults.paymentMethodRules;
  const shortNames = Array.isArray(format.itemShortNames)
    ? format.itemShortNames.filter(
        (rule): rule is LegacySettings['itemShortNames'][number] =>
          isNonArrayObject(rule) && isString(rule.name) && isString(rule.shortName) && isString(rule.match),
      )
    : defaults.itemShortNames;

  return {
    messageTemplate: isString(message.template) ? message.template : defaults.messageTemplate,
    cardCommissionPercent: isNumber(format.cardCommissionPercent)
      ? format.cardCommissionPercent
      : defaults.cardCommissionPercent,
    paymentTypes: {
      cashOnDelivery: isString(types.cashOnDelivery) ? types.cashOnDelivery : defaults.paymentTypes.cashOnDelivery,
      card: isString(types.card) ? types.card : defaults.paymentTypes.card,
    },
    paymentMethodRules: rules,
    itemShortNames: shortNames,
  };
}
