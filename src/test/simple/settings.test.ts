import * as assert from "assert";
import * as vscode from "vscode";
import {
  openDocument,
  getFixtureUri,
  waitForServerReady,
  waitForDiagnostics,
  i18nFilter,
  sleep,
} from "../helpers";

/** Insert then delete a space at the start of the file to trigger re-analysis. */
async function triggerReanalysis(uri: vscode.Uri): Promise<void> {
  const insertEdit = new vscode.WorkspaceEdit();
  insertEdit.insert(uri, new vscode.Position(0, 0), " ");
  await vscode.workspace.applyEdit(insertEdit);

  const deleteEdit = new vscode.WorkspaceEdit();
  deleteEdit.delete(
    uri,
    new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)),
  );
  await vscode.workspace.applyEdit(deleteEdit);
}

suite("Settings", () => {
  const config = () => vscode.workspace.getConfiguration("js-i18n");
  const uri = getFixtureUri("simple", "src/app.tsx");

  suiteSetup(async () => {
    await waitForServerReady();
  });

  test("changing diagnostic severity updates diagnostics", async () => {
    await openDocument(uri);
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });

    await config().update(
      "diagnostics.missingTranslation.severity",
      "error",
      vscode.ConfigurationTarget.Workspace,
    );
    await triggerReanalysis(uri);

    // Poll until severity changes
    const start = Date.now();
    let found = false;
    while (Date.now() - start < 15000) {
      await sleep(500);
      const diagnostics = vscode.languages
        .getDiagnostics(uri)
        .filter(i18nFilter);
      const errorDiags = diagnostics.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error,
      );
      if (errorDiags.length > 0) {
        found = true;
        break;
      }
    }

    assert.ok(
      found,
      "After changing severity to 'error', diagnostics should have Error severity",
    );

    // Restore and wait for diagnostics to settle
    await config().update(
      "diagnostics.missingTranslation.severity",
      undefined,
      vscode.ConfigurationTarget.Workspace,
    );
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });
  });

  test("disabling missing translation diagnostics clears them", async () => {
    await openDocument(uri);
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });

    await config().update(
      "diagnostics.missingTranslation.enabled",
      false,
      vscode.ConfigurationTarget.Workspace,
    );
    await triggerReanalysis(uri);

    // Poll until diagnostics clear
    const start = Date.now();
    let cleared = false;
    while (Date.now() - start < 15000) {
      await sleep(500);
      const diagnostics = vscode.languages
        .getDiagnostics(uri)
        .filter(i18nFilter)
        .filter((d) => d.message.toLowerCase().includes("missing"));
      if (diagnostics.length === 0) {
        cleared = true;
        break;
      }
    }

    assert.ok(
      cleared,
      "Disabling missingTranslation should clear those diagnostics",
    );

    // Restore and wait for diagnostics to come back
    await config().update(
      "diagnostics.missingTranslation.enabled",
      undefined,
      vscode.ConfigurationTarget.Workspace,
    );
    await triggerReanalysis(uri);
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });
  });
});
