import browser from 'webextension-polyfill';
import React, { FC, useCallback, useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { TabMessageEvent } from '../common/tab-message';
import { Order } from '../types/order';
import { parseOrder } from './events';
import { OrderItem } from './components/order-item';

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
      {orders.map((order, index) =>
        <OrderItem order={order} index={index} onClose={() => closeOrder(order.id)} />
      )}
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
