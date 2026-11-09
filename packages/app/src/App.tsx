import type { WorkSpaceTab } from "@components/workspace/types";
import WorkSpaceTabs from "@components/workspace/WorkSpaceTabs";

const mockTabs: WorkSpaceTab[] = [
  {
    id: crypto.randomUUID(),
    tabTitle: "Workspace 1",
    content: <div>Lmao</div>,
  },
  {
    id: crypto.randomUUID(),
    tabTitle: "Workspace 2",
    content: <div className="font-black">SUPER LMAO</div>,
  },
];

export function App() {
  return (
    <div className="p-1 bg-slate-200 h-screen">
      <WorkSpaceTabs initialTabs={mockTabs} />
    </div>
  );
}
