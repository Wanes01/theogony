import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const files = import.meta.glob("./locales/*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, object>;

const resources: Record<string, Record<string, object>> = {};

for (const [path, content] of Object.entries(files)) {
  const match = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
  if (!match) continue;

  const lng = match[1];
  const ns = match[2];
  if (!lng || !ns) continue;

  resources[lng] ??= {};
  resources[lng][ns] = content;
}

export const SUPPORTED_LANGUAGES = Object.keys(resources);

i18n.use(initReactI18next).init({
  resources,
  lng: "it",
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common"],
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
