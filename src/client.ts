import * as path from "path";
import { Uri } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StaticFeature,
  DynamicFeature,
} from "vscode-languageclient/node";
import { InitializeParams } from "vscode-languageserver-protocol";

export class I18nLanguageClient extends LanguageClient {
  constructor(
    id: string,
    name: string,
    serverOptions: ServerOptions,
    clientOptions: LanguageClientOptions,
    private projectRoot?: Uri,
  ) {
    super(id, name, serverOptions, clientOptions);
  }

  // Skip ExecuteCommandFeature to avoid duplicate command registration
  // when multiple servers run simultaneously. All server commands are
  // invoked directly via client.sendRequest("workspace/executeCommand").
  public override registerFeature(
    feature: StaticFeature | DynamicFeature<unknown>,
  ): void {
    if (
      "registrationType" in feature &&
      (feature as DynamicFeature<unknown>).registrationType?.method ===
        "workspace/executeCommand"
    ) {
      return;
    }
    super.registerFeature(feature);
  }

  protected override fillInitializeParams(params: InitializeParams): void {
    super.fillInitializeParams(params);
    params.capabilities.experimental = {
      ...params.capabilities.experimental,
      i18nEditTranslationCodeAction: true,
    };

    if (this.projectRoot) {
      params.workspaceFolders = [
        {
          uri: this.projectRoot.toString(),
          name: path.basename(this.projectRoot.fsPath),
        },
      ];
    }
  }
}
