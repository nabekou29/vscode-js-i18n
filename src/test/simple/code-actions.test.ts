import * as assert from "assert";
import * as vscode from "vscode";
import {
  openDocument,
  getFixtureUri,
  waitForServerReady,
  getCodeActions,
  rangeForText,
  waitForDiagnostics,
  i18nFilter,
} from "../helpers";

suite("Code Actions", () => {
  suiteSetup(async () => {
    await waitForServerReady();
  });

  test("code actions at t('farewell') include 'Edit translation' actions", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });

    const range = rangeForText(doc, '"farewell"');
    const actions = await getCodeActions(uri, range);

    const editActions = actions.filter((a) =>
      a.title.toLowerCase().includes("edit translation"),
    );
    assert.ok(
      editActions.length > 0,
      "Should have 'Edit translation' code actions for key missing in ja",
    );
  });

  test("code actions at t('farewell') include 'Delete key' action", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });

    const range = rangeForText(doc, '"farewell"');
    const actions = await getCodeActions(uri, range);

    const deleteAction = actions.find((a) =>
      a.title.toLowerCase().includes("delete"),
    );
    assert.ok(deleteAction, "Should have a 'Delete' code action");
  });

  test("code actions at t('greeting') do not include 'Edit translation' quickfix", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });

    const range = rangeForText(doc, '"greeting"');
    const actions = await getCodeActions(uri, range);

    // "greeting" is complete (present in all languages), so no "Edit translation" quickfix
    const editQuickfixes = actions.filter(
      (a) =>
        a.kind?.value === vscode.CodeActionKind.QuickFix.value &&
        a.title.toLowerCase().includes("edit translation"),
    );
    assert.strictEqual(
      editQuickfixes.length,
      0,
      "Complete key should not have 'Edit translation' quickfix",
    );
  });

  test("code actions on unused key in en.json include quickfix", async () => {
    const uri = getFixtureUri("simple", "locales/en.json");
    const doc = await openDocument(uri);
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });

    const range = rangeForText(doc, '"unused_key"');
    const actions = await getCodeActions(uri, range);

    const deleteAction = actions.find(
      (a) =>
        a.title.toLowerCase().includes("delete") &&
        a.title.toLowerCase().includes("unused"),
    );
    assert.ok(
      deleteAction,
      "Should have quickfix to delete unused key in JSON file",
    );
  });
});
