import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { cleanSettings, Settings, SettingsService, validateSettings } from "../services/settings-service";
import { MessageSettings } from "./components/message-settings";
import { OrderFormatSettings } from "./components/order-format-settings";

const Options = () => {
  const [settings, setSettings] = useState<Settings | undefined>();
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    SettingsService.get().then(setSettings);
  }, []);

  const showStatus = (text: string, durationMs = 1500) => {
    setStatus(text);
    setTimeout(() => setStatus(""), durationMs);
  };

  const saveSettings = async () => {
    if (!settings) {
      return;
    }
    const error = validateSettings(settings);
    if (error) {
      showStatus(error, 5000);
      return;
    }
    const cleaned = cleanSettings(settings);
    try {
      await SettingsService.save(cleaned);
    } catch (e) {
      // e.g. storage.sync quota exceeded by a very long list of rules
      showStatus(`Could not save settings: ${e instanceof Error ? e.message : String(e)}`, 5000);
      return;
    }
    setSettings(cleaned);
    showStatus("Settings saved.");
  };

  const resetSettings = async () => {
    if (!confirm("Reset all settings to default?")) {
      return;
    }
    setSettings(await SettingsService.reset());
    showStatus("Settings reset to default.");
  };

  if (!settings) {
    return null;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ margin: 0 }}>OLa Settings</h1>

      <MessageSettings
        value={settings.message}
        onChange={message => setSettings({ ...settings, message })}
      />

      <OrderFormatSettings
        value={settings.orderFormat}
        onChange={orderFormat => setSettings({ ...settings, orderFormat })}
      />

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button onClick={saveSettings}>Save</button>
        <button onClick={resetSettings}>Reset to default</button>
        <span>{status}</span>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
