import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Order } from "../types/order";
import { TabMessageEvent } from '../common/tab-message';
import { TabsService } from '../services/tabs-service'
import browser from 'webextension-polyfill';

const Popup = () => {
  const [order, setOrder] = useState<Order | undefined>();
  const [allTabs, setAllTabs] = useState<browser.Tabs.Tab[] | undefined>();
  const [switchToTab, setSwitchToTab] = useState(true);

  useEffect(() => {
    const fetchAllTabs = async () => {
      const allTabs = await TabsService.getAllTabs();
      setAllTabs(allTabs.filter(tab => tab.title));
    }

    fetchAllTabs();
  }, [])

  const parseOrder = async () => {
    const order = await TabsService.sendMessageToCurrentTab<TabMessageEvent.ParseOrder>({
      event: TabMessageEvent.ParseOrder,
    });
    setOrder(order);
  }

  const openOrder = async (tab: browser.Tabs.Tab) => {
    if (!order || !tab?.id) {
      return;
    }

    await TabsService.sendMessageToTab<TabMessageEvent.OpenOrderForm>(tab.id, {
      event: TabMessageEvent.OpenOrderForm,
      order
    });
    if (switchToTab) {
      TabsService.goToTab(tab.id);
    }
  }

  return (
    <div style={{ width: '500px', fontSize: '12px' }}>
      <button onClick={parseOrder}>Parse Order</button>
      <br />
      {order && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span>{order.id}</span>
          <span>Client name: {order.client.name}</span>
          <span>Client email: {order.client.email}</span>
          <span>Client phone: {order.client.phone}</span>
          <span>Delivery payment method: {order.delivery.paymentMethod}</span>
          <span>Delivery payment status: {order.delivery.paymentStatus}</span>
          <span>Delivery type: {order.delivery.type}</span>
          <span>Delivery address: {order.delivery.address}</span>
          <span>Delivery email: {order.delivery.email}</span>
          <span>Delivery phone: {order.delivery.phone}</span>
          <span>Delivery name: {order.delivery.name}</span>
          <span>Delivery ttn: {order.delivery.ttn}</span>
          <ul>
            {order.items.map((item, index) => (
              <div key={index}>
                <span>Item name: {item.name}</span>
                <span>Item params: {item.params}</span>
                <span>Item quantity: {item.quantity}</span>
                <span>Item price: {item.price}</span>
              </div>
            ))}
          </ul>
          <span>Click on tab to open Order Form</span>
          {allTabs && (<div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {allTabs.map((tab, index) => (
              <div key={index} style={{
                display: 'flex', 
                height: '18px', 
                width: '21%', 
                padding: '3px',
                margin: '3px',
                cursor: 'pointer',
                border: '1px grey solid'
              }} onClick={() => openOrder(tab)}>
                <img src={tab.favIconUrl} />
                <span style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.title}</span>
              </div>
            ))}
          </div>
          )}
          <div>
            <input type="checkbox" name="switch-to-tab" checked={switchToTab} onChange={() => setSwitchToTab(!switchToTab)} />
            <label>Switch to tab</label>
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
