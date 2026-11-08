import type { WorkSpaceTab } from "@components/ui/workspace/types";
import Tab from "@components/ui/workspace/Tab";
import Button from "@components/ui/buttons/Button";
import { useState } from "react";
import { Icons } from "@icons";

interface WorkSpaceTabsProps {
  readonly initialTabs: WorkSpaceTab[];
}

export default function WorkSpaceTabs({ initialTabs }: WorkSpaceTabsProps) {
  const [tabs, setTabs] = useState<WorkSpaceTab[]>(initialTabs);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTabs[0]?.id ?? null,
  );

  function handleAddTab() {
    const id = crypto.randomUUID();
    setTabs((prev) => [
      ...prev,
      { id, tabTitle: "Placeholder", content: <p>PLACEHOLDER</p> },
    ]);
    setSelectedId(id);
  }

  function handleCloseTab(id: string) {
    const index = tabs.findIndex((t) => t.id === id);
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);

    if (id === selectedId) {
      const next = remaining[Math.min(index, remaining.length - 1)];
      setSelectedId(next?.id ?? null);
    }
  }

  const selectedTab = tabs.find((t) => t.id === selectedId);

  return (
    <div className="flex flex-col gap-1 h-full w-full">
      <ul className="flex flex-row gap-1">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <Tab
              tabTitle={tab.tabTitle}
              selected={tab.id === selectedId}
              onSelect={() => setSelectedId(tab.id)}
              onDelete={() => handleCloseTab(tab.id)}
            />
          </li>
        ))}
        <li className="flex">
          <Button
            onClick={handleAddTab}
            aria-label="Add tab"
            className="flex aspect-square h-full cursor-pointer items-center justify-center rounded-lg border border-transparent text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Icons.Plus className="size-6" />
          </Button>
        </li>
      </ul>
      <div className="bg-white px-1 border border-slate-200 flex-1">
        {selectedTab?.content}
      </div>
    </div>
  );
}
