import { workspace } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

export function getFlatSettings(): Record<string, unknown> {
  const config = workspace.getConfiguration("jsI18n");

  return {
    translationFiles: {
      includePatterns: config.get("translationFiles.includePatterns"),
      excludePatterns: config.get("translationFiles.excludePatterns"),
    },
    includePatterns: config.get("includePatterns"),
    excludePatterns: config.get("excludePatterns"),
    keySeparator: config.get("keySeparator"),
    namespaceSeparator: config.get("namespaceSeparator"),
    defaultNamespace: config.get("defaultNamespace"),
    primaryLanguages: config.get("primaryLanguages"),
    diagnostics: {
      missingTranslation: {
        enabled: config.get("diagnostics.missingTranslation.enabled"),
        severity: config.get("diagnostics.missingTranslation.severity"),
        requiredLanguages: config.get(
          "diagnostics.missingTranslation.requiredLanguages",
        ),
        optionalLanguages: config.get(
          "diagnostics.missingTranslation.optionalLanguages",
        ),
      },
      unusedTranslation: {
        enabled: config.get("diagnostics.unusedTranslation.enabled"),
        severity: config.get("diagnostics.unusedTranslation.severity"),
        ignorePatterns: config.get(
          "diagnostics.unusedTranslation.ignorePatterns",
        ),
      },
    },
    indexing: {
      numThreads: config.get("indexing.numThreads"),
    },
  };
}

export async function sendConfiguration(
  client: LanguageClient,
): Promise<void> {
  await client.sendNotification("workspace/didChangeConfiguration", {
    settings: getFlatSettings(),
  });
}
