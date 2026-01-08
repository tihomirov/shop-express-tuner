import browser from 'webextension-polyfill';
import React, { FC, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TabMessageEvent } from '../common/tab-message';
import { Order } from '../types/order';
import { parseOrder } from './events';
import { OrderTable } from './components/order-table';

const App: FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const onTabMessage: browser.Runtime.OnMessageListener = (message: any, _sender, sendResponse) => {
      const event = message.event;

      switch (event) {
        case TabMessageEvent.ParseOrder:
          sendResponse(parseOrder())
          return true;
        case TabMessageEvent.OpenOrderForm:
          setOrders(orders => [
            ...orders,
            message.order as Order,
          ])
          sendResponse(undefined);
          return true;
        default:
          return true;;
      }
    }

    browser.runtime.onMessage.addListener(onTabMessage);

    return () => browser.runtime.onMessage.removeListener(onTabMessage);
  }, []);

  const closeOrder = useCallback((orderId: string) => {
    setOrders(orders => orders.filter(order => order.id !== orderId))
  }, []);

  return (
    <>
      {orders.map((order, indexx) => (
        <div key={order.id} style={{
          position: 'fixed',
          width: '600px',
          zIndex: `${99999 + indexx}`,
          right: '4px',
          top: '4px',
          backgroundColor: 'lightyellow',
          borderRadius: '6px',
          padding: '28px 6px 6px',
          overflowY: 'scroll',
          boxShadow: '3px 3px 7px 0px rgba(0,0,0,0.7)',
        }}>
          <button onClick={() => closeOrder(order.id)} style={{ position: 'absolute', top: '4px', left: '4px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="12" height="12" viewBox="0 0 50 50">
              <path d="M 7.71875 6.28125 L 6.28125 7.71875 L 23.5625 25 L 6.28125 42.28125 L 7.71875 43.71875 L 25 26.4375 L 42.28125 43.71875 L 43.71875 42.28125 L 26.4375 25 L 43.71875 7.71875 L 42.28125 6.28125 L 25 23.5625 Z"></path>
            </svg>
          </button>
          <OrderTable order={order} />
        </div>
      ))}
    </>
  );
};

const rootEl = document.createElement('div');

rootEl.id = 'ola-root';
rootEl.style.position = 'absolut';

document.body.appendChild(rootEl);

const root = createRoot(rootEl);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
