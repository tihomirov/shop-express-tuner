import { useEffect, useState } from 'react';
import { Settings, SettingsService } from '../services/settings-service';

// Settings from storage, kept up to date when they are changed on the options page
export function useSettings(): Settings | undefined {
  const [settings, setSettings] = useState<Settings | undefined>();

  useEffect(() => {
    let active = true;
    SettingsService.get().then(loaded => active && setSettings(loaded));
    const unsubscribe = SettingsService.subscribe(setSettings);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return settings;
}
