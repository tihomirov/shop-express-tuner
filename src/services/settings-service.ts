import browser from 'webextension-polyfill';

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
    const settings = (stored[STORAGE_KEY] ?? {}) as Partial<Settings>;

    // Merge per section so newly added settings get their defaults
    return {
      message: { ...DEFAULT_SETTINGS.message, ...settings.message },
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
