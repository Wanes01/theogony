import Button from "@components/ui/buttons/Button";
import { Icons } from "@icons";

interface TabProps {
  tabTitle: string;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

const tabStyles = {
  base: "flex items-center rounded-lg border transition-colors shrink-0",
  inactive:
    "border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
  active: "border-zinc-300 bg-white text-zinc-900 font-medium shadow-sm",
};

export default function Tab({
  tabTitle,
  selected,
  onSelect,
  onDelete,
}: TabProps) {
  return (
    <div
      className={`${tabStyles.base} ${selected ? tabStyles.active : tabStyles.inactive}`}
    >
      <Button
        onClick={onSelect}
        aria-current={selected ? "page" : undefined}
        className="cursor-pointer py-1.5 pl-3 pr-2 whitespace-nowrap"
      >
        {tabTitle}
      </Button>

      <Button
        onClick={onDelete}
        aria-label={`Close ${tabTitle}`}
        className="mr-1.5 cursor-pointer rounded-md text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 p-1 mt-0.5"
      >
        <Icons.Cross className="size-3" />
      </Button>
    </div>
  );
}
