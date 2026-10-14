import browser from 'webextension-polyfill';
import React, { FC, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { isTabMessage, TabMessageEvent } from '../common/tab-message';
import { extractRecipe } from '../recipe/extract';
import { TableModel } from '../recipe/outputs';
import { assertUnreachable } from '../utils/assert';
import { PinnedWindow } from './components/pinned-window';
import { Picker } from './picker';

type PinnedTable = Readonly<{
  windowId: number;
  title: string;
  table: TableModel;
}>;

let nextWindowId = 0;

const App: FC<{ host: HTMLElement }> = ({ host }) => {
  const [windows, setWindows] = useState<PinnedTable[]>([]);
  const [pickerRecipeId, setPickerRecipeId] = useState<string | undefined>();

  useEffect(() => {
    // Returning a promise sends its result (or error) back to the popup; returning nothing ignores the message
    const onTabMessage = (message: unknown): Promise<unknown> | undefined => {
      if (!isTabMessage(message)) {
        return;
      }

      switch (message.event) {
        case TabMessageEvent.ExtractRecipe:
          return new Promise(resolve => resolve(extractRecipe(message.recipe, document)));
        case TabMessageEvent.PinTable: {
          const pinned = { windowId: nextWindowId++, title: message.title, table: message.table };
          setWindows(windows => [...windows, pinned]);
          return Promise.resolve();
        }
        case TabMessageEvent.StartPicker:
          setPickerRecipeId(message.recipeId);
          return Promise.resolve();
        default:
          return assertUnreachable(message);
      }
    };

    browser.runtime.onMessage.addListener(onTabMessage);

    return () => browser.runtime.onMessage.removeListener(onTabMessage);
  }, []);

  const closeWindow = useCallback((windowId: number) => {
    setWindows(windows => windows.filter(pinned => pinned.windowId !== windowId));
  }, []);

  return (
    <>
      {windows.map(({ windowId, title, table }, index) =>
        <PinnedWindow key={windowId} title={title} table={table} index={index} onClose={() => closeWindow(windowId)} />
      )}
      {pickerRecipeId && <Picker key={pickerRecipeId} recipeId={pickerRecipeId} host={host} onClose={() => setPickerRecipeId(undefined)} />}
    </>
  );
};

const hostEl = document.createElement('div');
hostEl.id = 'ola-root';
document.body.appendChild(hostEl);

// Shadow DOM keeps the host page CSS away from the extension windows
const shadowRoot = hostEl.attachShadow({ mode: 'open' });
const rootEl = document.createElement('div');
shadowRoot.appendChild(rootEl);

createRoot(rootEl).render(
  <React.StrictMode>
    <App host={hostEl} />
  </React.StrictMode>
);
