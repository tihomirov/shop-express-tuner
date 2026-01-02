import { assertExists } from '../utils/assert';
import browser from 'webextension-polyfill';

import { TabMessage, TabMessageEvent, TabMessageResponse } from '../common/tab-message';

export type BrowserTab = browser.Tabs.Tab;

export class TabsService {
  static async getCurrentTab(): Promise<BrowserTab> {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });

    return tab;
  }

  static async sendMessageToCurrentTab<T extends TabMessageEvent>(
    message: TabMessage,
  ): Promise<TabMessageResponse[T]> {
    const { id } = await TabsService.getCurrentTab();
    assertExists(id, 'currentTab id must be defined to send message');

    return await TabsService.sendMessageToTab(id, message);
  }

  static async sendMessageToTab<T extends TabMessageEvent>(
    tabId: number,
    message: TabMessage,
  ): Promise<TabMessageResponse[T]> {
    return await browser.tabs.sendMessage(tabId, message);
  }

  static async getAllTabs(): Promise<BrowserTab[]> {
    return await browser.tabs.query({});
  }

  static goToTab(tabId: number): void {
    browser.tabs.update(tabId, { highlighted: true });
  }
}
