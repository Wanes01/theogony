import type { WorkSpaceTab } from "@components/ui/workspace/types";
import Button from "@components/ui/buttons/Button";
import { useState } from "react";
import { Icons } from "@icons";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import SortableTab from "@components/ui/workspace/SortableTab";

interface WorkSpaceTabsProps {
  readonly initialTabs: WorkSpaceTab[];
}

export default function WorkSpaceTabs({ initialTabs }: WorkSpaceTabsProps) {
  const [tabs, setTabs] = useState<WorkSpaceTab[]>(initialTabs);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTabs[0]?.id ?? null,
  );

  // drag-and-drop sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setTabs((prev) => {
      const from = prev.findIndex((t) => t.id === active.id);
      const to = prev.findIndex((t) => t.id === over.id);
      return arrayMove(prev, from, to);
    });
  }

  // tabs handling
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.map((t) => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          <ul className="flex flex-row gap-2">
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                selected={tab.id === selectedId}
                onSelect={() => setSelectedId(tab.id)}
                onDelete={() => handleCloseTab(tab.id)}
              />
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
        </SortableContext>
      </DndContext>
      <div className="bg-white px-1 border border-slate-200 flex-1">
        {selectedTab?.content}
      </div>
    </div>
  );
}
