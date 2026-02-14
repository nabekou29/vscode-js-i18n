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

// --- Server readiness ---

export async function waitForServerReady(): Promise<void> {
  await activateExtension();
  const uri = getFixtureUri("simple", "src/app.tsx");
  await openDocument(uri);
  await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });
}

// --- Position / Range helpers ---

export function getPosition(
  document: vscode.TextDocument,
  searchText: string,
  offset: number = 0,
): vscode.Position {
  const text = document.getText();
  const index = text.indexOf(searchText);
  if (index === -1) {
    throw new Error(`Text "${searchText}" not found in document`);
  }
  return document.positionAt(index + offset);
}

export function rangeForText(
  document: vscode.TextDocument,
  searchText: string,
): vscode.Range {
  const text = document.getText();
  const index = text.indexOf(searchText);
  if (index === -1) {
    throw new Error(`Text "${searchText}" not found in document`);
  }
  return new vscode.Range(
    document.positionAt(index),
    document.positionAt(index + searchText.length),
  );
}

// --- LSP provider helpers ---

export async function waitForHover(
  uri: vscode.Uri,
  position: vscode.Position,
  options: { timeoutMs?: number } = {},
): Promise<vscode.Hover[]> {
  const { timeoutMs = 15000 } = options;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      "vscode.executeHoverProvider",
      uri,
      position,
    );
    if (hovers && hovers.length > 0) {
      return hovers;
    }
    await sleep(500);
  }
  return (
    (await vscode.commands.executeCommand<vscode.Hover[]>(
      "vscode.executeHoverProvider",
      uri,
      position,
    )) ?? []
  );
}

export async function getCompletionItems(
  uri: vscode.Uri,
  position: vscode.Position,
  triggerChar?: string,
): Promise<vscode.CompletionList> {
  const result = await vscode.commands.executeCommand<vscode.CompletionList>(
    "vscode.executeCompletionItemProvider",
    uri,
    position,
    triggerChar,
  );
  return result ?? ({ items: [], isIncomplete: false } as vscode.CompletionList);
}

export async function getCodeActions(
  uri: vscode.Uri,
  range: vscode.Range,
): Promise<vscode.CodeAction[]> {
  const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
    "vscode.executeCodeActionProvider",
    uri,
    range,
  );
  return actions ?? [];
}

export async function getDefinitions(
  uri: vscode.Uri,
  position: vscode.Position,
): Promise<vscode.Location[]> {
  const locations = await vscode.commands.executeCommand<vscode.Location[]>(
    "vscode.executeDefinitionProvider",
    uri,
    position,
  );
  return locations ?? [];
}

export async function getReferences(
  uri: vscode.Uri,
  position: vscode.Position,
): Promise<vscode.Location[]> {
  const locations = await vscode.commands.executeCommand<vscode.Location[]>(
    "vscode.executeReferenceProvider",
    uri,
    position,
  );
  return locations ?? [];
}

// --- Hover content extraction ---

export function hoverContentsToString(hover: vscode.Hover): string {
  return hover.contents
    .map((c) => {
      if (typeof c === "string") return c;
      if (c instanceof vscode.MarkdownString) return c.value;
      return (c as { value: string }).value;
    })
    .join("\n");
}

// --- File restore for destructive tests ---

export async function withFileRestore(
  uri: vscode.Uri,
  fn: () => Promise<void>,
): Promise<void> {
  const original = await vscode.workspace.fs.readFile(uri);
  try {
    await fn();
  } finally {
    // Write original content back to disk
    await vscode.workspace.fs.writeFile(uri, original);
    // Revert the editor buffer to match disk content
    // (prevents dirty buffer from overwriting the restored file on auto-save)
    try {
      const doc = vscode.workspace.textDocuments.find(
        (d) => d.uri.toString() === uri.toString(),
      );
      if (doc?.isDirty) {
        await vscode.window.showTextDocument(doc);
        await vscode.commands.executeCommand("workbench.action.files.revert");
      }
    } catch {
      // Revert is best-effort
    }
    await sleep(2000);
  }
}
