import * as vscode from "vscode";
import { executeServerCommand } from "./client";
import { GetClientForUri } from "./types";

let statusBarItem: vscode.StatusBarItem | undefined;

export function activateStatusBar(
  getClientForUri: GetClientForUri,
  context: vscode.ExtensionContext,
): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "js-i18n.selectLanguage";
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand("js-i18n.selectLanguage", () =>
      selectLanguage(getClientForUri),
    ),
  );

  updateStatusBar(getClientForUri);
  statusBarItem.show();
}

function getActiveClient(
  getClientForUri: GetClientForUri,
): ReturnType<GetClientForUri> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return undefined;
  return getClientForUri(editor.document.uri);
}

async function updateStatusBar(
  getClientForUri: GetClientForUri,
): Promise<void> {
  if (!statusBarItem) return;

  const client = getActiveClient(getClientForUri);
  if (!client) {
    statusBarItem.text = "$(globe) \u2014";
    return;
  }

  try {
    const result = await executeServerCommand<{ language: string }>(
      client,
      "i18n.getCurrentLanguage",
    );

    statusBarItem.text = `$(globe) ${result?.language ?? "\u2014"}`;
    statusBarItem.tooltip = result?.language
      ? `Current language: ${result.language}\nClick to change`
      : "Click to select language";
  } catch {
    statusBarItem.text = "$(globe) \u2014";
  }
}

async function selectLanguage(
  getClientForUri: GetClientForUri,
): Promise<void> {
  const client = getActiveClient(getClientForUri);
  if (!client) {
    vscode.window.showWarningMessage("js-i18n server is not running");
    return;
  }

  try {
    const result = await executeServerCommand<{ languages: string[] }>(
      client,
      "i18n.getAvailableLanguages",
    );

    if (!result?.languages?.length) {
      vscode.window.showInformationMessage("No languages available");
      return;
    }

    const selected = await vscode.window.showQuickPick(result.languages, {
      placeHolder: "Select language for inline translation display",
    });

    if (selected) {
      await executeServerCommand(client, "i18n.setCurrentLanguage", [
        { language: selected },
      ]);
      await updateStatusBar(getClientForUri);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to change language: ${error}`);
  }
}

export function onStatusBarChanged(
  getClientForUri: GetClientForUri,
): void {
  updateStatusBar(getClientForUri);
}

export function deactivateStatusBar(): void {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}
