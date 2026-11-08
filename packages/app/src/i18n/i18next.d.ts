import "i18next";
import workspace from "./locales/it/workspace.json";

declare module "i18next" {
  interface CustomTypeOptions {
    // TODO: create a common NS for generic translations
    defaultNS: "common";
    resources: { workspace: typeof workspace };
  }
}
