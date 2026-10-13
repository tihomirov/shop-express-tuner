import browser from 'webextension-polyfill';
import { isNonArrayObject, isString } from '../utils/is-it';

export type MessageSettings = Readonly<{
  template: string;
}>;

export type Settings = Readonly<{
  message: MessageSettings;
}>;

export const DEFAULT_SETTINGS: Settings = {
  message: {
    template:
      '{firstName}, ваше замовлення укомплектоване та готове до відправки, номер ТТН {ttn}💌\n\nP/S Обережно! Бажання, загадані у цьому одязі, здійснюються💫',
  },
};

const STORAGE_KEY = 'settings';

export class SettingsService {
  static async get(): Promise<Settings> {
    const stored = await browser.storage.sync.get(STORAGE_KEY);
    const settings = stored[STORAGE_KEY];
    const message = isNonArrayObject(settings) && isNonArrayObject(settings.message) ? settings.message : {};

    // Use defaults for anything missing or malformed, e.g. settings added in a newer version
    return {
      message: {
        template: isString(message.template) ? message.template : DEFAULT_SETTINGS.message.template,
      },
    };
  }

  static async save(settings: Settings): Promise<void> {
    await browser.storage.sync.set({ [STORAGE_KEY]: settings });
  }

  static async reset(): Promise<Settings> {
    await browser.storage.sync.remove(STORAGE_KEY);
    return DEFAULT_SETTINGS;
  }
}
