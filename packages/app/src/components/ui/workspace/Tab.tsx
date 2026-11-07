import Button from "@components/ui/buttons/Button";

interface TabProps {
  tabTitle: string;
  selected: boolean;
  onClick: () => void;
}

const tabStyles = {
  base: "px-4 py-1.5 rounded-t-xl border border-b-0 -mb-px cursor-pointer transition-colors",
  inactive: "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-50",
  active: "border-slate-200 bg-white text-slate-900 font-medium",
};

export default function Tab({ tabTitle, selected, onClick }: TabProps) {
  return (
    <Button
      onClick={onClick}
      text={tabTitle}
      className={`${tabStyles.base} ${selected ? tabStyles.active : tabStyles.inactive}`}
    />
  );
}
