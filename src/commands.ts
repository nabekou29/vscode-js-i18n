import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

type GetClientForUri = (uri: vscode.Uri) => LanguageClient | undefined;

export function activateCommands(
  getClientForUri: GetClientForUri,
  context: vscode.ExtensionContext,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("jsI18n.copyKey", () =>
      copyKey(getClientForUri),
    ),
    vscode.commands.registerCommand("jsI18n.deleteUnusedKeys", () =>
      deleteUnusedKeys(getClientForUri),
    ),
  );
}

async function copyKey(getClientForUri: GetClientForUri): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const client = getClientForUri(editor.document.uri);
  if (!client) return;

  const uri = editor.document.uri.toString();
  const position = editor.selection.active;

  try {
    const result = (await client.sendRequest("workspace/executeCommand", {
      command: "i18n.getKeyAtPosition",
      arguments: [
        {
          uri,
          position: { line: position.line, character: position.character },
        },
      ],
    })) as { key: string } | null;

    if (result?.key) {
      await vscode.env.clipboard.writeText(result.key);
      vscode.window.showInformationMessage(`Copied key: ${result.key}`);
    } else {
      vscode.window.showWarningMessage("No translation key at cursor");
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to get key: ${error}`);
  }
}

async function deleteUnusedKeys(
  getClientForUri: GetClientForUri,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const client = getClientForUri(editor.document.uri);
  if (!client) return;

  const confirm = await vscode.window.showWarningMessage(
    "Delete all unused keys from this translation file?",
    { modal: true },
    "Delete",
  );

  if (confirm !== "Delete") return;

  try {
    const result = (await client.sendRequest("workspace/executeCommand", {
      command: "i18n.deleteUnusedKeys",
      arguments: [{ uri: editor.document.uri.toString() }],
    })) as { deletedCount: number; deletedKeys: string[] } | null;

    if (result) {
      vscode.window.showInformationMessage(
        `Deleted ${result.deletedCount} unused key(s)`,
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to delete unused keys: ${error}`,
    );
  }
}
