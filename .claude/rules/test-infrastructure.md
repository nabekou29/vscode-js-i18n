---
paths: "src/test/**"
---

# Test Infrastructure

- Framework: `@vscode/test-cli` + `@vscode/test-electron` + mocha (tdd ui)
- `tsconfig.test.json`: `rootDir: "."` → output to `out/src/test/...` (4 `..` to reach project root)
- Fixture `.vscode/settings.json` provides workspace settings (no hardcoded serverPath — resolves from PATH)
- `--disable-extensions` in launchArgs prevents interference
- `waitForDiagnostics` needs `filter` param (`i18nFilter`) to exclude TypeScript diagnostics

## Known Issue: Monorepo Tests

e2e-monorepo has failing tests due to server-side bug: `get_workspace_folders()` returns ALL workspace folders instead of the ones from `InitializeParams`. Fix requires server changes.
