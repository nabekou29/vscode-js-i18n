import * as vscode from "vscode";
import { executeServerCommand } from "./client";
import { GetClientForUri } from "./types";

export function activateCommands(
  getClientForUri: GetClientForUri,
  context: vscode.ExtensionContext,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("js-i18n.copyKey", () =>
      copyKey(getClientForUri),
    ),
    vscode.commands.registerCommand("js-i18n.deleteUnusedKeys", () =>
      deleteUnusedKeys(getClientForUri),
    ),
    vscode.commands.registerCommand(
      "js-i18n.selectDecorationMode",
      selectDecorationMode,
    ),
    // Client-side command invoked by server code actions.
    // Routes to the server via workspace/executeCommand.
    vscode.commands.registerCommand(
      "i18n.deleteUnusedKeys",
      async (args?: { uri: string }) => {
        if (!args?.uri) return;
        const uri = vscode.Uri.parse(args.uri);
        const client = getClientForUri(uri);
        if (!client) return;
        try {
          await executeServerCommand(client, "i18n.deleteUnusedKeys", [args]);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to delete unused keys: ${error}`,
          );
        }
      },
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
    const result = await executeServerCommand<{ key: string }>(
      client,
      "i18n.getKeyAtPosition",
      [{ uri, position: { line: position.line, character: position.character } }],
    );

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

interface DecorationModeOption {
  label: string;
  description: string;
  mode: string;
  cursorLine: string;
}

const DECORATION_MODES: DecorationModeOption[] = [
  {
    label: "Replace (inline on cursor line)",
    description: "Replace key with translation. Show inline on cursor line.",
    mode: "replace",
    cursorLine: "inline",
  },
  {
    label: "Replace (hide on cursor line)",
    description: "Replace key with translation. Hide on cursor line.",
    mode: "replace",
    cursorLine: "hide",
  },
  {
    label: "Inline",
    description: "Always show translation to the right of the key.",
    mode: "inline",
    cursorLine: "hide",
  },
];

async function selectDecorationMode(): Promise<void> {
  const config = vscode.workspace.getConfiguration("js-i18n");
  const currentMode = config.get<string>("decoration.mode", "replace");
  const currentCursorLine = config.get<string>("decoration.cursorLine", "inline");

  const items = DECORATION_MODES.map((opt) => ({
    ...opt,
    picked:
      opt.mode === currentMode && opt.cursorLine === currentCursorLine,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select decoration display mode",
  });

  if (!selected) return;

  const target = getConfigTargetScope(config, "decoration.mode");
  await config.update("decoration.mode", selected.mode, target);
  await config.update("decoration.cursorLine", selected.cursorLine, target);
}

function getConfigTargetScope(
  config: vscode.WorkspaceConfiguration,
  key: string,
): vscode.ConfigurationTarget {
  const inspected = config.inspect(key);
  if (inspected?.workspaceFolderValue !== undefined) {
    return vscode.ConfigurationTarget.WorkspaceFolder;
  }
  if (inspected?.workspaceValue !== undefined) {
    return vscode.ConfigurationTarget.Workspace;
  }
  return vscode.ConfigurationTarget.Global;
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
    const result = await executeServerCommand<{
      deletedCount: number;
      deletedKeys: string[];
    }>(client, "i18n.deleteUnusedKeys", [
      { uri: editor.document.uri.toString() },
    ]);

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
