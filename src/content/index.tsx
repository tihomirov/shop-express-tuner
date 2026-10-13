import browser from 'webextension-polyfill';
import React, { FC, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { isTabMessage, TabMessageEvent } from '../common/tab-message';
import { Order } from '../types/order';
import { assertUnreachable } from '../utils/assert';
import { parseOrder } from './events';
import { OrderItem } from './components/order-item';

type OrderWindow = Readonly<{
  windowId: number;
  order: Order;
}>;

let nextWindowId = 0;

const App: FC = () => {
  const [windows, setWindows] = useState<OrderWindow[]>([]);

  useEffect(() => {
    // Returning a promise sends its result (or error) back to the popup; returning nothing ignores the message
    const onTabMessage = (message: unknown): Promise<unknown> | undefined => {
      if (!isTabMessage(message)) {
        return;
      }

      switch (message.event) {
        case TabMessageEvent.ParseOrder:
          return new Promise(resolve => resolve(parseOrder()));
        case TabMessageEvent.OpenOrderForm: {
          const orderWindow = { windowId: nextWindowId++, order: message.order };
          setWindows(windows => [...windows, orderWindow]);
          return Promise.resolve();
        }
        default:
          return assertUnreachable(message);
      }
    };

    browser.runtime.onMessage.addListener(onTabMessage);

    return () => browser.runtime.onMessage.removeListener(onTabMessage);
  }, []);

  const closeWindow = useCallback((windowId: number) => {
    setWindows(windows => windows.filter(orderWindow => orderWindow.windowId !== windowId));
  }, []);

  return (
    <>
      {windows.map(({ windowId, order }, index) =>
        <OrderItem key={windowId} order={order} index={index} onClose={() => closeWindow(windowId)} />
      )}
    </>
  );
};

const hostEl = document.createElement('div');
hostEl.id = 'ola-root';
document.body.appendChild(hostEl);

// Shadow DOM keeps the host page CSS away from the order windows
const shadowRoot = hostEl.attachShadow({ mode: 'open' });
const rootEl = document.createElement('div');
shadowRoot.appendChild(rootEl);

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
