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
          <div>
						<h3>{order.id}</h3>
						<div>
								<h5>Client</h5>
									<div>{order.client.name}</div>
									<div>{order.client.email}</div>
									<div>{order.client.phone}</div>
						</div>

						<div>
								<h5>Delivery Info</h5>
									<div>Payment method: {order.delivery.paymentMethod}</div>
									<div>Payment status: {order.delivery.paymentStatus}</div>
									<div>Type: {order.delivery.type}</div>
									<div>Address: {order.delivery.address}</div>
									<div>Email: {order.delivery.email}</div>
									<div>Phone: {order.delivery.phone}</div>
									<div>Name: {order.delivery.name}</div>
									<div>TTN: {order.delivery.ttn}</div>
						</div>
					
						<div>
              {order.items.map((item, index) => (
								<ul key={index} style={{paddingBottom: '24px'}}>
									<div>{item.name}</div>
									<div>Params: {item.params}</div>
									<div>Quantity: {item.quantity}</div>
									<div>Price: {item.price}</div>
									<div>Actual Price: {item.actualPrice}</div>
									<div>Total Price: {item.totalPrice}</div>
								</ul>
              ))}
						</div>

						<h3>Total Price: {order.totalPrice}</h3>
		      </div>
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
