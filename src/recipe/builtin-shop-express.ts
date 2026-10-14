import { Action, Collection, ComputedField, Field, LookupRule, LookupTable, Recipe } from './types';

// The values a user could change on the old options page; they become part of the recipe
export type LegacySettings = Readonly<{
  messageTemplate: string;
  cardCommissionPercent: number;
  paymentTypes: Readonly<{ cashOnDelivery: string; card: string }>;
  paymentMethodRules: ReadonlyArray<Readonly<{ method: string; type: 'cashOnDelivery' | 'card' }>>;
  itemShortNames: ReadonlyArray<Readonly<{ match: 'equals' | 'startsWith' | 'contains'; name: string; shortName: string }>>;
}>;

export const DEFAULT_LEGACY_SETTINGS: LegacySettings = {
  messageTemplate:
    '{firstName}, ваше замовлення укомплектоване та готове до відправки, номер ТТН {ttn}💌\n\nP/S Обережно! Бажання, загадані у цьому одязі, здійснюються💫',
  cardCommissionPercent: 1.3,
  paymentTypes: { cashOnDelivery: 'Накладений', card: 'Сайт' },
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

export const SHOP_EXPRESS_RECIPE_ID = 'shop-express-order';

const section = (text: string) => ({ text, selector: 'p' });
const CLIENT = section('Клієнт');
const DELIVERY = section('Доставка');
const PAYMENT = section('Спосіб оплати');

// Section values are rendered as <p class="se-subheader">Label</p> followed by a <p> with the value
const labeled = (key: string, label: string, within: ReturnType<typeof section>, pipeline?: string): Field => ({
  key,
  locator: [{ kind: 'label', label, labelSelector: 'p.se-subheader', valueSelector: 'p:not(.se-subheader)', within }],
  extract: 'text',
  pipeline,
});

const css = (key: string, selector: string, extra: Partial<Field> = {}): Field => ({
  key,
  locator: [{ kind: 'css', selector }],
  extract: 'text',
  ...extra,
});

const FIELDS: ReadonlyArray<Field> = [
  css('orderId', 'h1 span'),
  { key: 'clientName', locator: [{ kind: 'css', selector: 'b', within: CLIENT }], extract: 'text' },
  { key: 'clientPhone', locator: [{ kind: 'css', selector: 'a[href^="tel:"]', within: CLIENT }], extract: 'text' },
  { key: 'clientEmail', locator: [{ kind: 'css', selector: 'a[href^="mailto:"]', within: CLIENT }], extract: 'text' },
  labeled('deliveryType', 'Доставка', DELIVERY),
  labeled('address', 'Адреса доставки', DELIVERY),
  labeled('ttn', 'Номер накладної (ТТН)', DELIVERY),
  labeled('fullName', "Ім'я", DELIVERY),
  labeled('email', 'Email', DELIVERY),
  labeled('phone', 'Телефон', DELIVERY),
  {
    key: 'paymentMethod',
    locator: [{ kind: 'css', selector: 'md-select[name="Payment"] md-select-value', within: PAYMENT }],
    extract: 'text',
  },
  labeled('paymentStatus', 'Статус оплати', PAYMENT),
  {
    key: 'total',
    locator: [{ kind: 'label', label: 'Всього:', labelSelector: 'b' }],
    extract: 'text',
    pipeline: 'number',
  },
];

const COMPUTED: ReadonlyArray<ComputedField> = [
  { key: 'firstName', template: '{fullName|split(" ", 1)}' },
  { key: 'lastName', template: '{fullName|split(" ", 0)}' },
  // The address looks like "<country>, <city>, <branch>"
  { key: 'city', template: '{address|split(",", 1)|trim}' },
  { key: 'phoneShort', template: '{phone|replace("^\\+?38", "")}' },
  { key: 'paymentKind', template: '{paymentMethod|lookup("paymentKinds")}' },
  { key: 'paymentType', template: '{paymentKind|lookup("paymentLabels")}' },
  // Card payments arrive minus the payment provider commission
  { key: 'received', template: '{total|percentOff(cardCommission)|round(2)}', when: '{paymentKind|eq("card")}' },
];

const ITEMS: Collection = {
  key: 'items',
  rowLocator: [{ kind: 'css', selector: 'tr[ng-repeat="product in Model.Products track by $index"]' }],
  fields: [
    css('name', 'td:nth-child(2) b'),
    css('params', 'td:nth-child(2) > p > span'),
    // Discounted items show two prices: "2000 ₴ 1800 ₴"
    css('prices', 'td:nth-child(3)'),
    css('quantity', 'td:nth-child(4) input', { extract: 'value', pipeline: 'number' }),
    css('totalPrice', 'td:nth-child(5)', { pipeline: 'number' }),
  ],
  computed: [
    { key: 'price', template: '{prices|split("₴", 0)|number}' },
    { key: 'actualPrice', template: '{prices|split("₴", 1)|number|default(price)}' },
    { key: 'shortName', template: '{name|lookup("shortNames")}' },
    // Params look like "Розмір: XL, Колір: Чорний"
    { key: 'size', template: '{params|kv("Розмір", 0)|lower}' },
    { key: 'color', template: '{params|kv("Колір", 1)}' },
    {
      key: 'discount',
      template: '{actualPrice|div(price)|mul(100)|round(0)|subFrom(100)|suffix("%")}',
      when: '{actualPrice|ne(price)}',
    },
  ],
};

const action = (id: string, label: string, kind: Action['kind'], url?: string): Action => ({ id, label, kind, url });

export function createShopExpressRecipe(settings: LegacySettings = DEFAULT_LEGACY_SETTINGS): Recipe {
  const { paymentTypes } = settings;

  const tables: LookupTable[] = [
    {
      name: 'paymentKinds',
      rules: settings.paymentMethodRules.map((rule): LookupRule => ({
        match: 'contains',
        pattern: rule.method,
        value: rule.type,
      })),
    },
    {
      name: 'paymentLabels',
      rules: [
        { match: 'equals', pattern: 'cashOnDelivery', value: paymentTypes.cashOnDelivery },
        { match: 'equals', pattern: 'card', value: paymentTypes.card },
      ],
    },
    {
      name: 'shortNames',
      rules: settings.itemShortNames.map(({ match, name, shortName }) => ({ match, pattern: name, value: shortName })),
    },
  ];

  return {
    id: SHOP_EXPRESS_RECIPE_ID,
    name: 'Shop Express order',
    version: 1,
    match: ['*'],
    constants: { cardCommission: String(settings.cardCommissionPercent) },
    fields: FIELDS,
    computed: COMPUTED,
    collections: [ITEMS],
    tables,
    outputs: [
      {
        id: 'message',
        type: 'message',
        title: 'Customer message',
        template: settings.messageTemplate,
        actions: [
          action('copy', 'Copy', 'copy'),
          action('telegram', 'Copy & Open Telegram', 'copyAndOpen', 'https://t.me/{phone}?text={message|url}&profile'),
          // phone is "+380…"; in a query string an unencoded "+" turns into a space
          action('viber', 'Copy & Open Viber', 'copyAndOpen', 'viber://chat?number={phone|url}&text={message|url}'),
        ],
      },
      {
        id: 'sheet-row',
        type: 'table',
        title: 'Spreadsheet rows',
        rows: 'items',
        repeatBy: 'quantity',
        columns: [
          { template: '{fullName}', scope: 'record' },
          { template: '{ttn}', scope: 'record' },
          { template: '{today}', scope: 'record' },
          { template: '{paymentType}', scope: 'record' },
          { template: 'Сайт', scope: 'record' },
          { template: '{actualPrice}', scope: 'row' },
          { template: '{received}', scope: 'record' },
          { template: '{discount}', scope: 'row' },
          { template: '', scope: 'record' },
          { template: '', scope: 'record' },
          { template: '{phoneShort}', scope: 'record' },
          { template: '{email}', scope: 'record' },
          { template: '{city}', scope: 'record' },
          { template: '{shortName}', scope: 'row' },
          { template: '{color}', scope: 'row' },
          { template: '{size}', scope: 'row' },
          { template: 'ч', scope: 'record' },
        ],
      },
    ],
  };
}
