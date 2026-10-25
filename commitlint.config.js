export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "app",
        "core",
        "shared",
        "config",
        "api",
        "android",
        "windows",
        "db",
        "editor",
        "ci",
        "deps",
        "docs",
        "repo",
      ],
    ],
    "subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
  },
};
