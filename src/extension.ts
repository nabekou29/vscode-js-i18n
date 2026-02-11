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

const SUPPORTED_LANGUAGES = new Set([
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
]);

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

function setupClient(client: LanguageClient): void {
  client.onNotification("i18n/decorationsChanged", () => {
    onDecorationsChanged(getClientForUri);
    onStatusBarChanged(getClientForUri);
  });
}

function createClientForProjectRoot(
  projectRoot: string,
  workspaceFolder: WorkspaceFolder,
): LanguageClient {
  const projectUri = Uri.file(projectRoot);

  if (!outputChannel) {
    outputChannel = window.createOutputChannel("JS I18n Language Server");
  }

  const serverPath = resolveServerPath();

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      ...[
        "javascript",
        "javascriptreact",
        "typescript",
        "typescriptreact",
        "json",
      ].map((language) => ({
        scheme: "file" as const,
        language,
        pattern: `${projectRoot}/**/*`,
      })),
    ],
    workspaceFolder: workspaceFolder,
    outputChannel,
  };

  return new I18nLanguageClient(
    "jsI18n",
    "JS I18n Language Server",
    { command: serverPath, transport: TransportKind.stdio },
    clientOptions,
    projectUri,
  );
}

function didOpenTextDocument(document: TextDocument): void {
  if (
    !SUPPORTED_LANGUAGES.has(document.languageId) ||
    (document.uri.scheme !== "file" && document.uri.scheme !== "untitled")
  ) {
    return;
  }

  if (!workspace.workspaceFolders) {
    if (!defaultClient) {
      if (!outputChannel) {
        outputChannel = window.createOutputChannel("JS I18n Language Server");
      }
      const serverPath = resolveServerPath();
      const clientOptions: LanguageClientOptions = {
        documentSelector: [
          { scheme: "file", language: "javascript" },
          { scheme: "file", language: "javascriptreact" },
          { scheme: "file", language: "typescript" },
          { scheme: "file", language: "typescriptreact" },
          { scheme: "file", language: "json" },
        ],
        outputChannel,
      };
      defaultClient = new I18nLanguageClient(
        "jsI18n",
        "JS I18n Language Server",
        { command: serverPath, transport: TransportKind.stdio },
        clientOptions,
      );
      defaultClient.start().then(async () => {
        setupClient(defaultClient!);
        await sendConfiguration(defaultClient!);
        onDecorationsChanged(getClientForUri);
        onStatusBarChanged(getClientForUri);
      });
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
  client.start().then(async () => {
    setupClient(client);
    await sendConfiguration(client);
    onDecorationsChanged(getClientForUri);
    onStatusBarChanged(getClientForUri);
  });
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
      if (e.affectsConfiguration("jsI18n")) {
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

  const promises: Promise<void>[] = [];
  if (defaultClient) {
    promises.push(defaultClient.stop());
  }
  for (const client of clients.values()) {
    promises.push(client.stop());
  }
  await Promise.all(promises);
}
