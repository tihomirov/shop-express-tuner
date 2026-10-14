import React, { FC, useState } from 'react';
import { BrowserTab } from '../../services/tabs-service';

type TabListProps = Readonly<{
  tabs: ReadonlyArray<BrowserTab>;
  onPick: (tab: BrowserTab, switchToTab: boolean) => void;
}>;

// Tabs to send the table to, e.g. the spreadsheet it is going to be pasted into
export const TabList: FC<TabListProps> = ({ tabs, onPick }) => {
  const [switchToTab, setSwitchToTab] = useState(true);

  return (
    <div>
      <div style={{ color: '#666', fontSize: '11px' }}>Show the table in a tab:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <div key={tab.id} title={tab.title} style={{
            display: 'flex',
            height: '18px',
            width: '21%',
            padding: '3px',
            margin: '3px',
            cursor: 'pointer',
            border: '1px grey solid'
          }} onClick={() => onPick(tab, switchToTab)}>
            {tab.favIconUrl && <img src={tab.favIconUrl} alt="" />}
            <span style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.title}</span>
          </div>
        ))}
      </div>
      <div>
        <input type="checkbox" id="switch-to-tab" checked={switchToTab} onChange={() => setSwitchToTab(!switchToTab)} />
        <label htmlFor="switch-to-tab">Switch to tab</label>
      </div>
    </div>
  );
};
