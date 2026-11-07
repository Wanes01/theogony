import type { WorkSpaceTab } from "@components/ui/workspace/types";
import { useState } from "react";

interface WorkSpaceTabsProps {
  readonly initialTabs: WorkSpaceTab[];
}

export default function WorkSpaceTabs({ initialTabs }: WorkSpaceTabsProps) {
  const [tabs, _] = useState<WorkSpaceTab[]>(initialTabs);
  const [selectedTab, setSelectedTab] = useState(0);
  return (
    <div>
      <ul className="flex flex-row gap-2">
        {tabs.map((tab, index) => (
          <li key={index} className="border px-2 py-1" onClick={() => setSelectedTab(index)}>
            {tab.tabTitle}
          </li>
        ))}
      </ul>
      <div>{tabs[selectedTab]?.content}</div>
    </div>
  );
}
