import { add } from "@theogony/core";
import { storySchema } from "@theogony/shared";

const sample = storySchema.safeParse({
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  name: "Cronache di Vaelor",
  calendarId: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
  schemaVersion: 1,
  createdAt: 1761350400000,
  updatedAt: 1761350400000,
});

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-stone-100">
      <h1 className="text-4xl font-bold text-indigo-700">Theogony</h1>
      <p>core: 2 + 3 = {add(2, 3)}</p>
      <p>shared: storia di esempio valida? {sample.success ? "sì" : "no"}</p>
    </main>
  );
}
