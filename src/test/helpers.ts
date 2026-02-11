import * as path from "path";
import * as vscode from "vscode";

// tsconfig.test.json: rootDir="." → out/src/test/helpers.js
// 3 levels up from out/src/test/ to reach project root
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

export function getFixtureUri(
  fixtureName: string,
  relativePath: string,
): vscode.Uri {
  return vscode.Uri.file(
    path.join(PROJECT_ROOT, "src", "test", "fixtures", fixtureName, relativePath),
  );
}

export async function activateExtension(): Promise<void> {
  const ext = vscode.extensions.getExtension("nabekou29.js-i18n");
  if (!ext) {
    throw new Error("Extension nabekou29.js-i18n not found");
  }
  if (!ext.isActive) {
    await ext.activate();
  }
}

export async function openDocument(
  uri: vscode.Uri,
): Promise<vscode.TextDocument> {
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);
  return doc;
}

export async function waitForDiagnostics(
  uri: vscode.Uri,
  options: {
    timeoutMs?: number;
    minCount?: number;
    filter?: (d: vscode.Diagnostic) => boolean;
  } = {},
): Promise<vscode.Diagnostic[]> {
  const { timeoutMs = 30000, minCount = 1, filter } = options;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    let diagnostics = vscode.languages.getDiagnostics(uri);
    if (filter) {
      diagnostics = diagnostics.filter(filter);
    }
    if (diagnostics.length >= minCount) {
      return diagnostics;
    }
    await sleep(500);
  }

  let diagnostics = vscode.languages.getDiagnostics(uri);
  if (filter) {
    diagnostics = diagnostics.filter(filter);
  }
  return diagnostics;
}

export function i18nFilter(d: vscode.Diagnostic): boolean {
  return d.source === "js-i18n" || d.message.includes("Translation key");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
