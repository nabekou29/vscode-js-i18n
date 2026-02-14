import * as assert from "assert";
import * as vscode from "vscode";
import { waitForServerReady } from "../helpers";

suite("Decorations", () => {
  suiteSetup(async () => {
    await waitForServerReady();
  });

  test("decoration.enabled defaults to true", () => {
    const config = vscode.workspace.getConfiguration("js-i18n");
    const enabled = config.get<boolean>("decoration.enabled");
    assert.strictEqual(enabled, true, "Decorations should be enabled by default");
  });

  test("decoration settings have correct defaults", () => {
    const config = vscode.workspace.getConfiguration("js-i18n");

    assert.strictEqual(
      config.get<string>("decoration.mode"),
      "replace",
      "Default decoration mode should be 'replace'",
    );
    assert.strictEqual(
      config.get<string>("decoration.cursorLine"),
      "inline",
      "Default cursor line behavior should be 'inline'",
    );
    assert.strictEqual(
      config.get<number | null>("decoration.maxLength"),
      50,
      "Default max length should be 50",
    );
  });
});
