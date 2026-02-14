import * as fs from "fs";
import * as path from "path";
import {
  workspace,
  ExtensionContext,
  OutputChannel,
  TextDocument,
  WorkspaceFolder,
  Uri,
  window,
} from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { I18nLanguageClient } from "./client";
import { resolveServerPath } from "./server";
import { sendConfiguration } from "./config";
import {
  activateDecorations,
  deactivateDecorations,
  onDecorationsChanged,
} from "./decorations";
import {
  activateStatusBar,
  deactivateStatusBar,
  onStatusBarChanged,
} from "./statusBar";
import { activateTranslationEditor } from "./translationEditor";
import { activateCommands } from "./commands";

const clients = new Map<string, LanguageClient>();
let defaultClient: LanguageClient | undefined;
let sortedFoldersCache: string[] | undefined;
let outputChannel: OutputChannel | undefined;

const SUPPORTED_LANGUAGES = [
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
  "json",
] as const;

const SUPPORTED_LANGUAGES_SET = new Set<string>(SUPPORTED_LANGUAGES);

function getAllClients(): LanguageClient[] {
  const all = [...clients.values()];
  if (defaultClient) all.push(defaultClient);
  return all;
}

function getClientForUri(uri: Uri): LanguageClient | undefined {
  if (defaultClient?.isRunning()) return defaultClient;

  const folder = workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return getAllClients().find((c) => c.isRunning());
  }

  const outerFolder = getOuterMostWorkspaceFolder(folder);
  const projectRoot = findProjectRoot(uri.fsPath, outerFolder);
  const key = Uri.file(projectRoot).toString();
  const client = clients.get(key);
  if (client?.isRunning()) return client;

  return getAllClients().find((c) => c.isRunning());
}

function sortedWorkspaceFolders(): string[] {
  if (!sortedFoldersCache) {
    sortedFoldersCache = (workspace.workspaceFolders ?? [])
      .map((f) => {
        let uri = f.uri.toString();
        if (!uri.endsWith("/")) uri += "/";
        return uri;
      })
      .sort((a, b) => a.length - b.length);
  }
  return sortedFoldersCache;
}

function getOuterMostWorkspaceFolder(folder: WorkspaceFolder): WorkspaceFolder {
  const sorted = sortedWorkspaceFolders();
  for (const element of sorted) {
    let uri = folder.uri.toString();
    if (!uri.endsWith("/")) uri += "/";
    if (uri.startsWith(element)) {
      return workspace.getWorkspaceFolder(Uri.parse(element))!;
    }
  }
  return folder;
}

function findProjectRoot(
  filePath: string,
  workspaceFolder: WorkspaceFolder,
): string {
  let dir = path.dirname(filePath);
  const workspaceRoot = workspaceFolder.uri.fsPath;

  while (dir.length >= workspaceRoot.length && dir.startsWith(workspaceRoot)) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return workspaceRoot;
}

function ensureOutputChannel(): OutputChannel {
  if (!outputChannel) {
    outputChannel = window.createOutputChannel("js-i18n-language-server");
  }
  return outputChannel;
}

function startClient(client: LanguageClient): void {
  client
    .start()
    .then(async () => {
      client.onNotification("i18n/decorationsChanged", () => {
        onDecorationsChanged(getClientForUri);
        onStatusBarChanged(getClientForUri);
      });
      await sendConfiguration(client);
      onDecorationsChanged(getClientForUri);
      onStatusBarChanged(getClientForUri);
    })
    .catch((error) => {
      ensureOutputChannel().appendLine(`Failed to start client: ${error}`);
    });
}

function createClientForProjectRoot(
  projectRoot: string,
  workspaceFolder: WorkspaceFolder,
): LanguageClient {
  const projectUri = Uri.file(projectRoot);
  const serverPath = resolveServerPath();

  const clientOptions: LanguageClientOptions = {
    documentSelector: SUPPORTED_LANGUAGES.map((language) => ({
      scheme: "file" as const,
      language,
      pattern: `${projectRoot}/**/*`,
    })),
    workspaceFolder,
    outputChannel: ensureOutputChannel(),
  };

  return new I18nLanguageClient(
    "js-i18n",
    "js-i18n-language-server",
    { command: serverPath, transport: TransportKind.stdio },
    clientOptions,
    projectUri,
  );
}

function didOpenTextDocument(document: TextDocument): void {
  if (
    !SUPPORTED_LANGUAGES_SET.has(document.languageId) ||
    (document.uri.scheme !== "file" && document.uri.scheme !== "untitled")
  ) {
    return;
  }

  if (!workspace.workspaceFolders) {
    if (!defaultClient) {
      const serverPath = resolveServerPath();
      const clientOptions: LanguageClientOptions = {
        documentSelector: SUPPORTED_LANGUAGES.map((language) => ({
          scheme: "file" as const,
          language,
        })),
        outputChannel: ensureOutputChannel(),
      };
      defaultClient = new I18nLanguageClient(
        "js-i18n",
        "js-i18n-language-server",
        { command: serverPath, transport: TransportKind.stdio },
        clientOptions,
      );
      startClient(defaultClient);
    }
    return;
  }

  let folder = workspace.getWorkspaceFolder(document.uri);
  if (!folder) return;
  folder = getOuterMostWorkspaceFolder(folder);

  const projectRoot = findProjectRoot(document.uri.fsPath, folder);
  const key = Uri.file(projectRoot).toString();
  if (clients.has(key)) return;

  const client = createClientForProjectRoot(projectRoot, folder);
  clients.set(key, client);
  startClient(client);
}

export function activate(context: ExtensionContext): void {
  context.subscriptions.push(
    workspace.onDidOpenTextDocument(didOpenTextDocument),
  );
  workspace.textDocuments.forEach(didOpenTextDocument);

  context.subscriptions.push(
    workspace.onDidChangeWorkspaceFolders((event) => {
      sortedFoldersCache = undefined;
      for (const folder of event.removed) {
        const folderPath = folder.uri.fsPath;
        for (const [key, client] of clients) {
          const clientPath = Uri.parse(key).fsPath;
          if (clientPath.startsWith(folderPath)) {
            clients.delete(key);
            client.stop();
          }
        }
      }
    }),
  );

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("js-i18n")) {
        for (const client of getAllClients()) {
          sendConfiguration(client);
        }
      }
    }),
  );

  activateDecorations(getClientForUri, context);
  activateStatusBar(getClientForUri, context);
  activateTranslationEditor(getClientForUri, context);
  activateCommands(getClientForUri, context);
}

export async function deactivate(): Promise<void> {
  deactivateDecorations();
  deactivateStatusBar();
  await Promise.all(getAllClients().map((client) => client.stop()));
}
