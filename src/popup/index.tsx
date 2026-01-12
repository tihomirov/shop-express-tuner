import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from 'webextension-polyfill';
import { Order } from "../types/order";
import { TabMessageEvent } from '../common/tab-message';
import { TabsService } from '../services/tabs-service'
import { OrderForm } from './components/order-form'
import { MessageForm } from './components/message-form'

const Popup = () => {
  const [order, setOrder] = useState<Order | undefined>();
  const [allTabs, setAllTabs] = useState<browser.Tabs.Tab[] | undefined>();
  const [switchToTab, setSwitchToTab] = useState(true);

  useEffect(() => {
    const fetchAllTabs = async () => {
      const allTabs = await TabsService.getAllTabs();
      setAllTabs(allTabs.filter(tab => tab.title));
    }

    const parseOrder = async () => {
      const order = await TabsService.sendMessageToCurrentTab<TabMessageEvent.ParseOrder>({
        event: TabMessageEvent.ParseOrder,
      });
      setOrder(order);
    }

    fetchAllTabs();
    parseOrder();
  }, [])



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
    <div style={{ width: '600px', fontSize: '12px' }}>
      {order && <OrderForm order={order} />}
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
        <div>
          <input type="checkbox" name="switch-to-tab" checked={switchToTab} onChange={() => setSwitchToTab(!switchToTab)} />
          <label>Switch to tab</label>
        </div>
      </div>
      )}
      {order && <MessageForm order={order} />}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
