import type { WorkSpaceTab } from "@components/ui/workspace/types";
import WorkSpaceTabs from "@components/ui/workspace/WorkSpaceTabs";

const mockTabs: WorkSpaceTab[] = [
  {
    tabTitle: "Workspace 1",
    content: <div>Lmao</div>,
  },
  {
    tabTitle: "Workspace 2",
    content: <div className="font-black">SUPER LMAO</div>,
  },
];

export function App() {
  return (
    <div className="p-2">
      <WorkSpaceTabs initialTabs={mockTabs} />
    </div>
  );
}
