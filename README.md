# JS I18n

i18next / next-intl / react-intl support for VS Code, powered by [js-i18n-language-server](https://github.com/user/js-i18n-language-server).

## Features

- **Inline translation display** -- See translation values directly in your code
- **Translation diagnostics** -- Detect missing and unused translation keys
- **Language switcher** -- Switch display language from status bar or command palette
- **Edit translations** -- Edit translation values from code actions or command palette
- **Copy key** -- Copy the translation key at cursor to clipboard
- **Delete unused keys** -- Remove translation keys not referenced in code
- **Key prefix / Namespace / Monorepo** -- Full support for complex project structures

## Demo

<video src="docs/videos/demo.mp4" autoplay loop muted playsinline></video>

## Inline Translation Display

Translation values are displayed directly in your code, replacing the key text.

![Inline translations](docs/images/inline-translations.png)

### Decoration Modes

<video src="docs/videos/decoration-modes.mp4" autoplay loop muted playsinline></video>

Choose how translations are displayed via `JS I18n: Select Decoration Mode` command.

| Mode | Behavior | Cursor line |
|------|----------|-------------|
| **Replace + Inline** (default) | Key is replaced with translation | Shows translation to the right |
| **Replace + Hide** | Key is replaced with translation | Hidden |
| **Inline** | Key stays visible | Translation shown to the right |

## Translation Diagnostics

| Type | Target | Default severity | Description |
|------|--------|------------------|-------------|
| **Missing translations** | Source files (`.tsx`, `.ts`, ...) | Warning | Keys used in code but not translated for some languages |
| **Unused translations** | Translation files (`.json`) | Hint | Keys defined in JSON but not referenced by any source code |

![Missing translation diagnostics](docs/images/diagnostics.png)

![Unused translation diagnostics](docs/images/unused-diagnostics.png)

## Language Switcher

![Language Switcher](docs/images/language-switcher.png)

Switch the display language from the status bar or command palette.

## Key Prefix

![Key prefix](docs/images/key-prefix.png)

`useTranslation({ keyPrefix: "stats" })` automatically prepends the prefix to all `t()` calls, reducing repetition in deeply nested translation structures.

## Namespace Support

![Namespace support](docs/images/namespace.png)

Multiple `useTranslation()` calls with different namespaces are fully supported. The same key name resolves to different values depending on the namespace.

## Monorepo Support

![Monorepo support](docs/images/monorepo.png)

Automatic per-package server isolation based on `package.json` boundaries. The same key resolves to different translations in each package.

## Requirements

[js-i18n-language-server](https://github.com/user/js-i18n-language-server) must be installed and available in your PATH, or configured via `jsI18n.serverPath`.

```bash
cargo install js-i18n-language-server
```

## Supported Libraries

- [i18next](https://www.i18next.com/) / [react-i18next](https://react.i18next.com/)
- [next-intl](https://next-intl-docs.vercel.app/)
- [react-intl](https://formatjs.io/docs/react-intl/)

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jsI18n.serverPath` | `null` | Path to `js-i18n-language-server` binary |
| `jsI18n.translationFiles.includePatterns` | `["**/{locales,messages}/**/*.json"]` | Glob patterns for translation files |
| `jsI18n.translationFiles.excludePatterns` | `[]` | Glob patterns to exclude |
| `jsI18n.includePatterns` | `["**/*.{js,jsx,ts,tsx}"]` | Source file glob patterns |
| `jsI18n.excludePatterns` | `["node_modules/**"]` | Source file exclusion patterns |
| `jsI18n.keySeparator` | `"."` | Separator for nested translation keys |
| `jsI18n.namespaceSeparator` | `null` | Separator between namespace and key |
| `jsI18n.defaultNamespace` | `null` | Default namespace when none is specified |
| `jsI18n.primaryLanguages` | `null` | Fallback language priority |
| `jsI18n.decoration.enabled` | `true` | Enable inline translation display |
| `jsI18n.decoration.maxLength` | `50` | Max display length for inline translation |
| `jsI18n.decoration.mode` | `"replace"` | Display mode: `replace` or `inline` |
| `jsI18n.decoration.cursorLine` | `"inline"` | Cursor line behavior: `hide` or `inline` |
| `jsI18n.diagnostics.missingTranslation.enabled` | `true` | Enable missing translation diagnostics |
| `jsI18n.diagnostics.missingTranslation.severity` | `"warning"` | Severity level |
| `jsI18n.diagnostics.unusedTranslation.enabled` | `true` | Enable unused translation diagnostics |
| `jsI18n.diagnostics.unusedTranslation.severity` | `"hint"` | Severity level |

## License

MIT
