import { describe, it, expect } from "vitest";

const SOURCE = "it";

const files = import.meta.glob("./locales/*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, object>;

/** utility to list all the flattened keys */
const flat = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? flat(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );

// byLang[language][namespace] = sorted keys
const byLang: Record<string, Record<string, string[]>> = {};
for (const [path, content] of Object.entries(files)) {
  const match = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
  const lng = match?.[1];
  const ns = match?.[2];
  if (!lng || !ns) continue;
  (byLang[lng] ??= {})[ns] = flat(content).sort();
}

const source = byLang[SOURCE] ?? {};
const otherLanguages = Object.keys(byLang).filter((l) => l !== SOURCE);

it(`esiste la lingua sorgente (${SOURCE})`, () => {
  expect(Object.keys(source).length).toBeGreaterThan(0);
});

// ensures that each i18n json file has the same keys
describe.each(otherLanguages)("lingua %s", (lng) => {
  it.each(Object.keys(source))(
    "namespace %s ha le stesse chiavi di it",
    (ns) => {
      expect(byLang[lng]?.[ns] ?? []).toEqual(source[ns]);
    },
  );
});
