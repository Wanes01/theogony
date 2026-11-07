import type { WorkSpaceTab } from "@components/ui/workspace/types";
import Tab from "@components/ui/workspace/Tab";
import { useState } from "react";

interface WorkSpaceTabsProps {
  readonly initialTabs: WorkSpaceTab[];
}

export default function WorkSpaceTabs({ initialTabs }: WorkSpaceTabsProps) {
  const [tabs, _] = useState<WorkSpaceTab[]>(initialTabs);
  const [selectedTab, setSelectedTab] = useState(0);
  return (
    <div className="flex flex-col h-full w-full">
      <ul className="flex flex-row gap-2">
        {tabs.map((tab, index) => (
          <li key={index}>
            <Tab
              onClick={() => setSelectedTab(index)}
              tabTitle={tab.tabTitle}
              selected={index === selectedTab}
            />
          </li>
        ))}
      </ul>
      <div className="bg-white px-1 border border-slate-200 flex-1">
        {tabs[selectedTab]?.content}
      </div>
    </div>
  );
}
