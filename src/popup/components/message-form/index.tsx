import React, { FC, useCallback, useState } from "react";
import { Order } from "../../../types/order";

export const MessageForm: FC<{ order: Order }> = ({ order }) => {
  const [message, setMessage] = useState(`${order.delivery.name.split(' ')[1]}, ваше замовлення укомплектоване та готове до відправки, номер ТТН ${order.delivery.ttn}💌\n\nP/S Обережно! Бажання, загадані у цьому одязі, здійснюються💫`)
  const onCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message);
  }, [message]);

  const onCopyAndOpenTelegram = useCallback(async () => {
    await onCopy();
    window.open(`https://t.me/${order.delivery.phone}?text=${encodeURIComponent(message)}&profile`);
  }, [onCopy, message]);

  const onCopyAndOpenViber = useCallback(async () => {
    await onCopy();
    window.open(`viber://chat?number=${order.delivery.phone}&text=${encodeURIComponent(message)}`);
  }, [onCopy, message]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label htmlFor="myTextarea">Your Message:</label>
      <textarea
        id="myTextarea"
        name="message"
        rows={4}
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
        <button onClick={onCopy}>Copy</button>
        <button onClick={onCopyAndOpenTelegram}>Copy & Open Telegram</button>
        <button onClick={onCopyAndOpenViber}>Copy & Open Viber</button>
      </div>
    </div>
  );
};
