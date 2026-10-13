import { assertExists } from '../utils/assert';
import browser from 'webextension-polyfill';

import { TabMessage, TabMessageResponse } from '../common/tab-message';

export type BrowserTab = browser.Tabs.Tab;

export class TabsService {
  static async getCurrentTab(): Promise<BrowserTab> {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });

    return tab;
  }

  static async sendMessageToCurrentTab<M extends TabMessage>(message: M): Promise<TabMessageResponse[M['event']]> {
    const { id } = await TabsService.getCurrentTab();
    assertExists(id, 'currentTab id must be defined to send message');

    return await TabsService.sendMessageToTab(id, message);
  }

  static async sendMessageToTab<M extends TabMessage>(tabId: number, message: M): Promise<TabMessageResponse[M['event']]> {
    return await browser.tabs.sendMessage(tabId, message) as TabMessageResponse[M['event']];
  }

  static async getAllTabs(): Promise<BrowserTab[]> {
    return await browser.tabs.query({});
  }

  static async goToTab(tab: BrowserTab): Promise<void> {
    assertExists(tab.id, 'tab id must be defined to switch to it');
    await browser.tabs.update(tab.id, { active: true });

    if (tab.windowId !== undefined) {
      await browser.windows.update(tab.windowId, { focused: true });
    }
  }
}
