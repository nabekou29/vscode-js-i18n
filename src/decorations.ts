import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

interface DecorationInfo {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  value: string;
  key: string;
}

type GetClientForUri = (uri: vscode.Uri) => LanguageClient | undefined;

function truncateText(text: string, maxLength: number | null): string {
  if (maxLength && text.length > maxLength) {
    return text.substring(0, maxLength) + "\u2026";
  }
  return text;
}

let annotationDecorationType: vscode.TextEditorDecorationType | undefined;
let disappearDecorationType: vscode.TextEditorDecorationType | undefined;
const debounceTimers = new Map<string, NodeJS.Timeout>();
const cachedDecorations = new Map<string, DecorationInfo[]>();

export function activateDecorations(
  getClientForUri: GetClientForUri,
  context: vscode.ExtensionContext,
): void {
  annotationDecorationType = vscode.window.createTextEditorDecorationType({});
  disappearDecorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: "none; display: none;",
  });

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      debounceRefresh(getClientForUri);
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) {
        debounceRefresh(getClientForUri);
      }
    }),
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor === vscode.window.activeTextEditor) {
        const uri = e.textEditor.document.uri.toString();
        if (!debounceTimers.has(uri)) {
          applyDecorations(e.textEditor);
        }
      }
    }),
  );

  debounceRefresh(getClientForUri);
}

function debounceRefresh(getClientForUri: GetClientForUri): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const key = editor.document.uri.toString();
  const existing = debounceTimers.get(key);

  if (!existing) {
    fetchAndApply(getClientForUri);
  } else {
    clearTimeout(existing);
  }

  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      fetchAndApply(getClientForUri);
    }, 200),
  );
}

async function fetchAndApply(getClientForUri: GetClientForUri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const config = vscode.workspace.getConfiguration("jsI18n");
  if (!config.get<boolean>("decoration.enabled", true)) {
    clearDecorations(editor);
    return;
  }

  const uri = editor.document.uri.toString();
  const client = getClientForUri(editor.document.uri);
  if (!client) return;

  try {
    const result = await client.sendRequest("workspace/executeCommand", {
      command: "i18n.getDecorations",
      arguments: [{ uri }],
    });

    const decorations = (result as DecorationInfo[] | null) ?? [];
    cachedDecorations.set(uri, decorations);
    applyDecorations(editor);
  } catch {
    // Server may not support decorations yet
  }
}

function applyDecorations(editor: vscode.TextEditor): void {
  if (!annotationDecorationType || !disappearDecorationType) return;

  const uri = editor.document.uri.toString();
  const decorations = cachedDecorations.get(uri);
  if (!decorations) {
    clearDecorations(editor);
    return;
  }

  const config = vscode.workspace.getConfiguration("jsI18n");
  if (!config.get<boolean>("decoration.enabled", true)) {
    clearDecorations(editor);
    return;
  }

  const maxLength = config.get<number | null>("decoration.maxLength", 50);
  const mode = config.get<string>("decoration.mode", "replace");
  const cursorLineBehavior = config.get<string>("decoration.cursorLine", "inline");
  const selection = editor.selection;

  const annotations: vscode.DecorationOptions[] = [];
  const disappears: vscode.Range[] = [];

  for (const deco of decorations) {
    const range = new vscode.Range(
      deco.range.start.line,
      deco.range.start.character,
      deco.range.end.line,
      deco.range.end.character,
    );

    const cursorOnLine =
      (selection.start.line <= range.start.line &&
        range.start.line <= selection.end.line) ||
      (selection.start.line <= range.end.line &&
        range.end.line <= selection.end.line);

    const truncated = truncateText(deco.value, maxLength);

    if (mode === "inline") {
      // Always show to the right (key text stays visible)
      annotations.push({
        range,
        hoverMessage: deco.key,
        renderOptions: {
          after: {
            contentText: ` ${truncated}`,
            color: new vscode.ThemeColor("editorCodeLens.foreground"),
            fontStyle: "italic",
          },
        },
      });
    } else if (!cursorOnLine) {
      // Replace mode, not on cursor line: hide key, show translation
      annotations.push({
        range,
        hoverMessage: deco.key,
        renderOptions: {
          after: {
            contentText: truncated,
            color: new vscode.ThemeColor("editorCodeLens.foreground"),
            fontStyle: "normal",
          },
        },
      });
      disappears.push(range);
    } else if (cursorLineBehavior === "inline") {
      // Replace mode, cursor line, inline: show to the right
      annotations.push({
        range,
        hoverMessage: deco.key,
        renderOptions: {
          after: {
            contentText: ` ${truncated}`,
            color: new vscode.ThemeColor("editorCodeLens.foreground"),
            fontStyle: "italic",
          },
        },
      });
    } else {
      // Replace mode, cursor line, hide: show nothing
      annotations.push({
        range,
        hoverMessage: deco.key,
        renderOptions: {
          after: { contentText: "" },
        },
      });
    }
  }

  editor.setDecorations(annotationDecorationType, annotations);
  editor.setDecorations(disappearDecorationType, disappears);
}

function clearDecorations(editor: vscode.TextEditor): void {
  if (annotationDecorationType) {
    editor.setDecorations(annotationDecorationType, []);
  }
  if (disappearDecorationType) {
    editor.setDecorations(disappearDecorationType, []);
  }
}

export function onDecorationsChanged(getClientForUri: GetClientForUri): void {
  debounceRefresh(getClientForUri);
}

export function deactivateDecorations(): void {
  if (annotationDecorationType) {
    annotationDecorationType.dispose();
    annotationDecorationType = undefined;
  }
  if (disappearDecorationType) {
    disappearDecorationType.dispose();
    disappearDecorationType = undefined;
  }
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  cachedDecorations.clear();
}
