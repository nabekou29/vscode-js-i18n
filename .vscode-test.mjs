import { defineConfig } from "@vscode/test-cli";

export default defineConfig([
  {
    label: "e2e",
    files: "out/src/test/simple/**/*.test.js",
    workspaceFolder: "src/test/fixtures/simple",
    launchArgs: ["--disable-extensions"],
    mocha: {
      ui: "tdd",
      timeout: 60000,
    },
  },
  {
    label: "e2e-monorepo",
    files: "out/src/test/monorepo/**/*.test.js",
    workspaceFolder: "src/test/fixtures/monorepo",
    launchArgs: ["--disable-extensions"],
    mocha: {
      ui: "tdd",
      timeout: 60000,
    },
  },
]);
