# js-i18n (VSCode Extension)

VSCode extension wrapping Rust LSP server `js-i18n-language-server` for i18n support.

## Architecture

- **Multi-server**: One `LanguageClient` per project root (based on `package.json` boundaries)
- **I18nLanguageClient**: Subclass setting `experimental.i18nEditTranslationCodeAction` via `fillInitializeParams`
- **Config sync**: Manual flat settings via `workspace/didChangeConfiguration` (no `synchronize.configurationSection`)
- **Server binary**: Resolved via config → node_modules → PATH

## Commands

```bash
pnpm build          # Build extension (esbuild → out/extension.js)
pnpm build:test     # Build tests (tsc → out/src/test/...)
pnpm check          # Type check
pnpm test:e2e       # Run E2E tests (requires build + build:test)
```

## Commit Guidelines

- Write in English
- Do NOT include `Co-Authored-By` or `Generated with Claude Code`
- Use `feat!` for breaking changes
