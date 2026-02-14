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

/**
 * Replace the full content of a document, save, and return the updated document.
 */
async function replaceAndSave(
  uri: vscode.Uri,
  replaceFn: (text: string) => string,
): Promise<vscode.TextDocument> {
  const doc = await openDocument(uri);
  const oldText = doc.getText();
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    uri,
    new vscode.Range(doc.positionAt(0), doc.positionAt(oldText.length)),
    replaceFn(oldText),
  );
  await vscode.workspace.applyEdit(edit);
  await doc.save();
  return doc;
}

/**
 * Poll until no diagnostics matching `keyword` remain on `uri`.
 */
async function waitForDiagnosticToDisappear(
  uri: vscode.Uri,
  keyword: string,
  timeoutMs: number = 15000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(1000);
    await openDocument(uri);
    const remaining = vscode.languages.getDiagnostics(uri).filter(i18nFilter);
    if (!remaining.find((d) => d.message.includes(keyword))) {
      return true;
    }
  }
  return false;
}

suite("Edit Translation", () => {
  suiteSetup(async () => {
    await waitForServerReady();
  });

  test("adding missing translation to ja.json resolves farewell diagnostic", async () => {
    const jaUri = getFixtureUri("simple", "locales/ja.json");
    const appUri = getFixtureUri("simple", "src/app.tsx");

    await withFileRestore(jaUri, async () => {
      // Confirm farewell diagnostic exists
      await openDocument(appUri);
      const before = await waitForDiagnostics(appUri, {
        filter: i18nFilter,
        minCount: 1,
      });
      const farewellBefore = before.find((d) => d.message.includes("farewell"));
      assert.ok(farewellBefore, "farewell missing diagnostic should exist before edit");

      // Edit ja.json to add farewell translation
      await replaceAndSave(jaUri, (text) =>
        text.replace(
          /"greeting": "こんにちは"/,
          '"greeting": "こんにちは",\n  "farewell": "さようなら"',
        ),
      );

      const resolved = await waitForDiagnosticToDisappear(appUri, "farewell");
      assert.ok(
        resolved,
        "farewell diagnostic should be resolved after adding translation to ja.json",
      );
    });
  });

  test("adding missing translation to en.json resolves nonexistent diagnostic", async () => {
    const enUri = getFixtureUri("simple", "locales/en.json");
    const appUri = getFixtureUri("simple", "src/app.tsx");

    // Wait for previous test's file restore to propagate
    await sleep(2000);

    await withFileRestore(enUri, async () => {
      // Confirm nonexistent diagnostic exists
      await openDocument(appUri);
      const before = await waitForDiagnostics(appUri, {
        filter: i18nFilter,
        minCount: 1,
      });
      const nonexistentBefore = before.find((d) =>
        d.message.includes("nonexistent"),
      );
      assert.ok(
        nonexistentBefore,
        "nonexistent missing diagnostic should exist before edit",
      );

      // Edit en.json to add nonexistent translation
      await replaceAndSave(enUri, (text) =>
        text.replace(
          /"unused_key": "This value is never used"/,
          '"unused_key": "This value is never used",\n  "nonexistent": "Does not exist"',
        ),
      );

      const resolved = await waitForDiagnosticToDisappear(appUri, "nonexistent");
      if (!resolved) {
        const remainingDiags = vscode.languages
          .getDiagnostics(appUri)
          .filter(i18nFilter);
        const enDoc = await vscode.workspace.openTextDocument(enUri);
        assert.fail(
          `nonexistent diagnostic should be resolved. ` +
          `Remaining diagnostics: ${remainingDiags.map((d) => d.message).join("; ")}. ` +
          `en.json content: ${enDoc.getText().substring(0, 200)}`,
        );
      }
    });
  });
});
