import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WorkSpaceTab } from "@components/workspace/types";
import Tab from "@components/workspace/Tab";

interface SortableTabProps {
  readonly tab: WorkSpaceTab;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onDelete: () => void;
}

export default function SortableTab({
  tab,
  selected,
  onSelect,
  onDelete,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.8 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <Tab
        tabTitle={tab.tabTitle}
        selected={selected}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    </li>
  );
}
