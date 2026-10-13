import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from 'webextension-polyfill';
import { Order } from "../types/order";
import { TabMessageEvent } from '../common/tab-message';
import { BrowserTab, TabsService } from '../services/tabs-service'
import { OrderForm } from './components/order-form'
import { MessageForm } from './components/message-form'
import { Settings, SettingsService } from '../services/settings-service'

// Pages like chrome:// or tabs opened before the extension was installed have no content script
const NO_CONTENT_SCRIPT_HINT = 'Reload the tab and try again.';

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const Popup = () => {
  const [order, setOrder] = useState<Order | undefined>();
  const [settings, setSettings] = useState<Settings | undefined>();
  const [allTabs, setAllTabs] = useState<BrowserTab[] | undefined>();
  const [switchToTab, setSwitchToTab] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const fetchAllTabs = async () => {
      const allTabs = await TabsService.getAllTabs();
      setAllTabs(allTabs.filter(tab => tab.title));
    }

    const parseOrder = async () => {
      try {
        setOrder(await TabsService.sendMessageToCurrentTab({ event: TabMessageEvent.ParseOrder }));
      } catch (e) {
        setError(`No order found on this page: ${getErrorMessage(e)}`);
      }
    }

    fetchAllTabs();
    parseOrder();
    SettingsService.get().then(setSettings);
  }, [])

  const openOrder = async (tab: BrowserTab) => {
    if (!order || tab.id === undefined) {
      return;
    }

    try {
      await TabsService.sendMessageToTab(tab.id, { event: TabMessageEvent.OpenOrderForm, order });
      setError(undefined);
    } catch (e) {
      setError(`Could not open the order in "${tab.title}". ${NO_CONTENT_SCRIPT_HINT}`);
      return;
    }

    if (switchToTab) {
      await TabsService.goToTab(tab);
    }
  }

  return (
    <div style={{ width: '600px', fontSize: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button title="Settings" onClick={() => browser.runtime.openOptionsPage()}>⚙️ Settings</button>
      </div>
      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      {order && <OrderForm order={order} />}
      {order && allTabs && (<div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {allTabs.map(tab => (
          <div key={tab.id} title={tab.title} style={{
            display: 'flex',
            height: '18px',
            width: '21%',
            padding: '3px',
            margin: '3px',
            cursor: 'pointer',
            border: '1px grey solid'
          }} onClick={() => openOrder(tab)}>
            {tab.favIconUrl && <img src={tab.favIconUrl} alt="" />}
            <span style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.title}</span>
          </div>
        ))}
        <div>
          <input type="checkbox" id="switch-to-tab" checked={switchToTab} onChange={() => setSwitchToTab(!switchToTab)} />
          <label htmlFor="switch-to-tab">Switch to tab</label>
        </div>
      </div>
      )}
      {order && settings && <MessageForm order={order} template={settings.message.template} />}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
