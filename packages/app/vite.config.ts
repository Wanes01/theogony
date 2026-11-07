import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  resolve: {
    alias: [
      {
        find: /^@components\//,
        replacement: fileURLToPath(new URL("./src/components/", import.meta.url)),
      },
      {
        find: /^@model\//,
        replacement: fileURLToPath(new URL("../shared/src/model/", import.meta.url)),
      },
    ],
  },
});
