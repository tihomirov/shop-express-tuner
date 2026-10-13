import React, { FC, useState } from "react";
import {
  getItemShortName,
  ITEM_NAME_MATCHES,
  ItemNameMatch,
  ItemShortNameRule,
  OrderFormatSettings as OrderFormatSettingsType,
  PAYMENT_TYPE_KEYS,
  PaymentMethodRule,
  PaymentTypeKey,
} from "../../../common/order-format";

const PAYMENT_TYPE_TITLES: Readonly<Record<PaymentTypeKey, string>> = {
  cashOnDelivery: 'Cash on delivery',
  card: 'Card (commission applies)',
};

const ITEM_NAME_MATCH_TITLES: Readonly<Record<ItemNameMatch, string>> = {
  equals: 'Equals',
  startsWith: 'Starts with',
  contains: 'Contains',
};

const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
const hintStyle: React.CSSProperties = { margin: 0, color: '#555' };
const rowStyle: React.CSSProperties = { display: 'flex', gap: '6px', alignItems: 'center' };
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0 };

const replaceAt = <T,>(items: ReadonlyArray<T>, index: number, item: T) =>
  items.map((current, i) => (i === index ? item : current));

const removeAt = <T,>(items: ReadonlyArray<T>, index: number) => items.filter((_, i) => i !== index);

const swap = <T,>(items: ReadonlyArray<T>, from: number, to: number) => {
  const result = [...items];
  [result[from], result[to]] = [result[to], result[from]];
  return result;
};

type OrderFormatSettingsProps = {
  value: OrderFormatSettingsType;
  onChange: (value: OrderFormatSettingsType) => void;
};

export const OrderFormatSettings: FC<OrderFormatSettingsProps> = ({ value, onChange }) => {
  const [testName, setTestName] = useState('');

  const setPaymentMethodRules = (paymentMethodRules: ReadonlyArray<PaymentMethodRule>) =>
    onChange({ ...value, paymentMethodRules });

  const setItemShortNames = (itemShortNames: ReadonlyArray<ItemShortNameRule>) =>
    onChange({ ...value, itemShortNames });

  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0 }}>Order table</h2>

      <h3 style={{ margin: '8px 0 0' }}>Card commission</h3>
      <p style={hintStyle}>Subtracted from the order total for card payments.</p>
      <label style={rowStyle}>
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={value.cardCommissionPercent}
          onChange={e => onChange({ ...value, cardCommissionPercent: e.target.valueAsNumber })}
          style={{ width: '80px' }}
        />
        %
      </label>

      <h3 style={{ margin: '8px 0 0' }}>Payment types</h3>
      <p style={hintStyle}>Text shown in the table for each payment type.</p>
      {PAYMENT_TYPE_KEYS.map(key => (
        <label key={key} style={rowStyle}>
          <span style={{ width: '200px' }}>{PAYMENT_TYPE_TITLES[key]}</span>
          <input
            value={value.paymentTypes[key]}
            onChange={e => onChange({ ...value, paymentTypes: { ...value.paymentTypes, [key]: e.target.value } })}
            style={inputStyle}
          />
        </label>
      ))}

      <h3 style={{ margin: '8px 0 0' }}>Payment methods</h3>
      <p style={hintStyle}>The payment method from the order page is matched to a payment type if it contains the text.</p>
      {value.paymentMethodRules.map((rule, index) => (
        <div key={index} style={rowStyle}>
          <input
            placeholder="Payment method contains"
            value={rule.method}
            onChange={e => setPaymentMethodRules(replaceAt(value.paymentMethodRules, index, { ...rule, method: e.target.value }))}
            style={inputStyle}
          />
          <select
            value={rule.type}
            onChange={e =>
              setPaymentMethodRules(replaceAt(value.paymentMethodRules, index, { ...rule, type: e.target.value as PaymentTypeKey }))
            }
          >
            {PAYMENT_TYPE_KEYS.map(key => (
              <option key={key} value={key}>{PAYMENT_TYPE_TITLES[key]}</option>
            ))}
          </select>
          <button title="Remove" onClick={() => setPaymentMethodRules(removeAt(value.paymentMethodRules, index))}>✕</button>
        </div>
      ))}
      <div>
        <button onClick={() => setPaymentMethodRules([...value.paymentMethodRules, { method: '', type: 'cashOnDelivery' }])}>
          Add payment method
        </button>
      </div>

      <h3 style={{ margin: '8px 0 0' }}>Item short names</h3>
      <p style={hintStyle}>Rules are checked from top to bottom; the first matching rule gives the short name.</p>
      {value.itemShortNames.map((rule, index) => (
        <div key={index} style={rowStyle}>
          <select
            value={rule.match}
            onChange={e =>
              setItemShortNames(replaceAt(value.itemShortNames, index, { ...rule, match: e.target.value as ItemNameMatch }))
            }
          >
            {ITEM_NAME_MATCHES.map(match => (
              <option key={match} value={match}>{ITEM_NAME_MATCH_TITLES[match]}</option>
            ))}
          </select>
          <input
            placeholder="Item name"
            value={rule.name}
            onChange={e => setItemShortNames(replaceAt(value.itemShortNames, index, { ...rule, name: e.target.value }))}
            style={{ ...inputStyle, flex: 2 }}
          />
          <input
            placeholder="Short name"
            value={rule.shortName}
            onChange={e => setItemShortNames(replaceAt(value.itemShortNames, index, { ...rule, shortName: e.target.value }))}
            style={inputStyle}
          />
          <button title="Move up" disabled={index === 0} onClick={() => setItemShortNames(swap(value.itemShortNames, index, index - 1))}>
            ↑
          </button>
          <button
            title="Move down"
            disabled={index === value.itemShortNames.length - 1}
            onClick={() => setItemShortNames(swap(value.itemShortNames, index, index + 1))}
          >
            ↓
          </button>
          <button title="Remove" onClick={() => setItemShortNames(removeAt(value.itemShortNames, index))}>✕</button>
        </div>
      ))}
      <div>
        <button onClick={() => setItemShortNames([...value.itemShortNames, { match: 'equals', name: '', shortName: '' }])}>
          Add item short name
        </button>
      </div>

      <div style={rowStyle}>
        <input
          placeholder="Try an item name"
          value={testName}
          onChange={e => setTestName(e.target.value)}
          style={inputStyle}
        />
        <span>→</span>
        <span style={{ ...inputStyle, padding: '2px 8px', background: '#f4f4f4', borderRadius: '4px', minHeight: '1.2em' }}>
          {testName && (getItemShortName(testName, value) || 'no match')}
        </span>
      </div>
    </section>
  );
};
