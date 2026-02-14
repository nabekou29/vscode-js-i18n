import * as assert from "assert";
import * as vscode from "vscode";
import {
  openDocument,
  getFixtureUri,
  waitForServerReady,
  getPosition,
  waitForDiagnostics,
  i18nFilter,
  sleep,
} from "../helpers";

suite("Commands", () => {
  suiteSetup(async () => {
    await waitForServerReady();
  });

  test("js-i18n.copyKey copies translation key to clipboard", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });

    const position = getPosition(doc, '"greeting"', 1);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(position, position);

    await vscode.env.clipboard.writeText("");
    await vscode.commands.executeCommand("js-i18n.copyKey");
    await sleep(1000);

    const clipboardContent = await vscode.env.clipboard.readText();
    assert.strictEqual(
      clipboardContent,
      "greeting",
      "Clipboard should contain the translation key 'greeting'",
    );
  });

  test("js-i18n.copyKey on non-key position does not change clipboard", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);

    const position = getPosition(doc, "<div>", 1);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(position, position);

    await vscode.env.clipboard.writeText("initial");
    await vscode.commands.executeCommand("js-i18n.copyKey");
    await sleep(1000);

    const clipboardContent = await vscode.env.clipboard.readText();
    assert.strictEqual(
      clipboardContent,
      "initial",
      "Clipboard should not change when no key at cursor",
    );
  });

  test("registered commands are available", async () => {
    const commands = await vscode.commands.getCommands(true);
    const expectedCommands = [
      "js-i18n.copyKey",
      "js-i18n.deleteUnusedKeys",
      "js-i18n.editTranslation",
      "js-i18n.selectLanguage",
      "js-i18n.selectDecorationMode",
      "i18n.deleteUnusedKeys",
      "i18n.executeClientEditTranslation",
    ];

    for (const cmd of expectedCommands) {
      assert.ok(
        commands.includes(cmd),
        `Command '${cmd}' should be registered`,
      );
    }
  });
});
