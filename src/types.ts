import { Uri } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

export type GetClientForUri = (uri: Uri) => LanguageClient | undefined;
