import type { WorkSpaceTab } from "@components/workspace/types";
import WorkSpaceTabs from "@components/workspace/WorkSpaceTabs";
import PanelLayout from "@components/ui/panels/PanelLayout";

const mockTabs: WorkSpaceTab[] = [
  {
    id: crypto.randomUUID(),
    tabTitle: "Workspace 1",
    content: <PanelLayout />,
  },
  {
    id: crypto.randomUUID(),
    tabTitle: "Workspace 2",
    content: <PanelLayout />,
  },
];

export function App() {
  return (
    <div className="p-1 bg-slate-200 h-screen text-zinc-900">
      <WorkSpaceTabs initialTabs={mockTabs} />
    </div>
  );
}
