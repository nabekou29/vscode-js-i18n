import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

type GetClientForUri = (uri: vscode.Uri) => LanguageClient | undefined;

export function activateTranslationEditor(
  getClientForUri: GetClientForUri,
  context: vscode.ExtensionContext,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "js-i18n.editTranslation",
      async (args?: { lang: string; key: string }) => {
        if (args) {
          await promptEditTranslation(getClientForUri, args.lang, args.key);
          return;
        }
        // Called from command palette: resolve key at cursor, then pick language
        await editTranslationAtCursor(getClientForUri);
      },
    ),
  );

  // Client-side command invoked by server code actions
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "i18n.executeClientEditTranslation",
      async (args?: { lang: string; key: string }) => {
        if (!args) return;
        await promptEditTranslation(getClientForUri, args.lang, args.key);
      },
    ),
  );
}

async function editTranslationAtCursor(
  getClientForUri: GetClientForUri,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const client = getClientForUri(editor.document.uri);
  if (!client) return;

  const uri = editor.document.uri.toString();
  const position = editor.selection.active;

  let key: string | undefined;
  try {
    const result = (await client.sendRequest("workspace/executeCommand", {
      command: "i18n.getKeyAtPosition",
      arguments: [
        { uri, position: { line: position.line, character: position.character } },
      ],
    })) as { key: string } | null;
    key = result?.key;
  } catch {
    // No key at cursor
  }

  if (!key) {
    vscode.window.showWarningMessage("No translation key at cursor");
    return;
  }

  let languages: string[] = [];
  try {
    const result = (await client.sendRequest("workspace/executeCommand", {
      command: "i18n.getAvailableLanguages",
      arguments: [],
    })) as { languages: string[] } | null;
    languages = result?.languages ?? [];
  } catch {
    // Fallback
  }

  if (!languages.length) {
    vscode.window.showWarningMessage("No languages available");
    return;
  }

  const lang = await vscode.window.showQuickPick(languages, {
    placeHolder: `Select language to edit "${key}"`,
  });

  if (lang) {
    await promptEditTranslation(getClientForUri, lang, key);
  }
}

async function promptEditTranslation(
  getClientForUri: GetClientForUri,
  lang: string,
  key: string,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const client = editor ? getClientForUri(editor.document.uri) : undefined;
  if (!client) return;

  let currentValue: string | undefined;
  try {
    const result = (await client.sendRequest("workspace/executeCommand", {
      command: "i18n.getTranslationValue",
      arguments: [{ lang, key }],
    })) as { value: string } | null;
    currentValue = result?.value;
  } catch {
    // Key doesn't exist yet
  }

  const newValue = await vscode.window.showInputBox({
    prompt: `Enter translation for "${key}" in ${lang}`,
    value: currentValue,
    placeHolder: "Translation value",
  });

  if (newValue !== undefined) {
    try {
      await client.sendRequest("workspace/executeCommand", {
        command: "i18n.editTranslation",
        arguments: [{ lang, key, value: newValue }],
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update translation: ${error}`);
    }
  }
}
