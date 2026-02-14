import * as vscode from "vscode";
import { executeServerCommand } from "./client";
import { GetClientForUri } from "./types";

interface DecorationInfo {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  value: string;
  key: string;
}

function truncateText(text: string, maxLength: number | null): string {
  if (maxLength != null && text.length > maxLength) {
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

  const config = vscode.workspace.getConfiguration("js-i18n");
  if (!config.get<boolean>("decoration.enabled", true)) {
    clearDecorations(editor);
    return;
  }

  const uri = editor.document.uri.toString();
  const client = getClientForUri(editor.document.uri);
  if (!client) return;

  try {
    const decorations =
      (await executeServerCommand<DecorationInfo[]>(
        client,
        "i18n.getDecorations",
        [{ uri }],
      )) ?? [];
    cachedDecorations.set(uri, decorations);
    applyDecorations(editor);
  } catch {
    // Server may not support decorations yet
  }
}

function makeAnnotation(
  range: vscode.Range,
  key: string,
  contentText: string,
  fontStyle: string,
): vscode.DecorationOptions {
  const color = contentText
    ? new vscode.ThemeColor("editorCodeLens.foreground")
    : undefined;

  return {
    range,
    hoverMessage: key,
    renderOptions: {
      after: { contentText, color, fontStyle },
    },
  };
}

function applyDecorations(editor: vscode.TextEditor): void {
  if (!annotationDecorationType || !disappearDecorationType) return;

  const uri = editor.document.uri.toString();
  const decorations = cachedDecorations.get(uri);
  if (!decorations) {
    clearDecorations(editor);
    return;
  }

  const config = vscode.workspace.getConfiguration("js-i18n");
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

    // Show inline (to the right) when: inline mode, or replace mode on cursor line with inline behavior
    const showInline =
      mode === "inline" || (cursorOnLine && cursorLineBehavior === "inline");

    if (showInline) {
      annotations.push(
        makeAnnotation(range, deco.key, ` ${truncated}`, "italic"),
      );
    } else if (!cursorOnLine) {
      // Replace mode, not on cursor line: hide key text, show translation
      annotations.push(
        makeAnnotation(range, deco.key, truncated, "normal"),
      );
      disappears.push(range);
    } else {
      // Replace mode, cursor line, hide behavior: show nothing
      annotations.push(makeAnnotation(range, deco.key, "", ""));
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
