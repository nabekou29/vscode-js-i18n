import * as assert from "assert";
import * as vscode from "vscode";
import {
  openDocument,
  getFixtureUri,
  waitForServerReady,
  waitForDiagnostics,
  i18nFilter,
  withFileRestore,
  sleep,
} from "../helpers";

suite("Unused Translation Keys", () => {
  suiteSetup(async () => {
    await waitForServerReady();
  });

  test("i18n.deleteUnusedKeys removes unused key from file", async () => {
    const uri = getFixtureUri("simple", "locales/en.json");

    await withFileRestore(uri, async () => {
      const doc = await openDocument(uri);
      await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });

      // Verify unused_key exists before deletion
      assert.ok(
        doc.getText().includes("unused_key"),
        "en.json should contain unused_key before deletion",
      );

      await vscode.commands.executeCommand("i18n.deleteUnusedKeys", {
        uri: uri.toString(),
      });

      // Wait for server to apply workspace edit
      const start = Date.now();
      let deleted = false;
      while (Date.now() - start < 15000) {
        await sleep(500);
        const current = await vscode.workspace.openTextDocument(uri);
        if (!current.getText().includes("unused_key")) {
          deleted = true;
          break;
        }
      }

      assert.ok(deleted, "unused_key should be removed from en.json");

      const finalDoc = await vscode.workspace.openTextDocument(uri);
      const content = finalDoc.getText();
      assert.ok(
        content.includes("greeting"),
        "greeting should still be in en.json",
      );
      assert.ok(
        content.includes("farewell"),
        "farewell should still be in en.json",
      );
    });
  });
});
