import React, { FC, useMemo, useRef } from "react";
import { MessageSettings as MessageSettingsType } from "../../../services/settings-service";
import { MESSAGE_PLACEHOLDERS, renderMessageTemplate } from "../../../common/message-template";
import { Order } from "../../../types/order";

const SAMPLE_ORDER: Order = {
  id: '12345',
  client: { name: 'Шевченко Олена', phone: '+380501234567', email: 'olena@example.com' },
  delivery: {
    type: 'Нова Пошта',
    address: 'Україна, Київ, Відділення №1',
    ttn: '20450000000000',
    name: 'Шевченко Олена',
    email: 'olena@example.com',
    phone: '+380501234567',
    paymentMethod: 'Накладений платіж',
    paymentStatus: 'Не оплачено',
  },
  items: [],
  totalPrice: 1250,
};

type MessageSettingsProps = {
  value: MessageSettingsType;
  onChange: (value: MessageSettingsType) => void;
};

export const MessageSettings: FC<MessageSettingsProps> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const preview = useMemo(() => renderMessageTemplate(value.template, SAMPLE_ORDER), [value.template]);

  const insertPlaceholder = (key: string) => {
    const textarea = textareaRef.current;
    const token = `{${key}}`;
    const start = textarea?.selectionStart ?? value.template.length;
    const end = textarea?.selectionEnd ?? value.template.length;

    onChange({ ...value, template: value.template.slice(0, start) + token + value.template.slice(end) });

    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 style={{ margin: 0 }}>Message</h2>
      <p style={{ margin: 0, color: '#555' }}>
        Template for the customer message in the popup. Click a placeholder to insert it at the cursor.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {MESSAGE_PLACEHOLDERS.map(({ key, description }) => (
          <button key={key} title={description} onClick={() => insertPlaceholder(key)}>
            {`{${key}}`}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        rows={6}
        value={value.template}
        onChange={e => onChange({ ...value, template: e.target.value })}
        style={{ fontFamily: 'inherit', fontSize: '14px' }}
      />

      <h4 style={{ margin: '8px 0 0' }}>Preview</h4>
      <div style={{ whiteSpace: 'pre-wrap', padding: '8px', background: '#f4f4f4', borderRadius: '4px' }}>
        {preview}
      </div>
    </section>
  );
};
