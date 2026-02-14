import * as assert from "assert";
import * as vscode from "vscode";
import {
  openDocument,
  getFixtureUri,
  waitForServerReady,
  getCompletionItems,
} from "../helpers";

suite("Completion", () => {
  suiteSetup(async () => {
    await waitForServerReady();
  });

  test("completion inside t('') returns translation keys", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);

    // Position cursor right after opening quote in t("greeting")
    const text = doc.getText();
    const tCallIndex = text.indexOf('t("greeting"');
    const quotePos = doc.positionAt(tCallIndex + 3); // after t("

    const completions = await getCompletionItems(uri, quotePos);

    assert.ok(completions.items.length > 0, "Should return completion items");

    const labels = completions.items.map((item) =>
      typeof item.label === "string" ? item.label : item.label.label,
    );
    assert.ok(
      labels.includes("greeting"),
      "Completion should include 'greeting'",
    );
    assert.ok(
      labels.includes("farewell"),
      "Completion should include 'farewell'",
    );
  });

  test("completion items have CompletionItemKind.Constant", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);

    const text = doc.getText();
    const tCallIndex = text.indexOf('t("greeting"');
    const quotePos = doc.positionAt(tCallIndex + 3);

    const completions = await getCompletionItems(uri, quotePos);

    const greetingItem = completions.items.find((item) => {
      const label =
        typeof item.label === "string" ? item.label : item.label.label;
      return label === "greeting";
    });

    assert.ok(greetingItem, "Should find 'greeting' completion item");
    assert.strictEqual(
      greetingItem.kind,
      vscode.CompletionItemKind.Constant,
      "Completion item should have kind Constant",
    );
  });

  test("completion item detail contains translation value", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);

    const text = doc.getText();
    const tCallIndex = text.indexOf('t("greeting"');
    const quotePos = doc.positionAt(tCallIndex + 3);

    const completions = await getCompletionItems(uri, quotePos);

    const greetingItem = completions.items.find((item) => {
      const label =
        typeof item.label === "string" ? item.label : item.label.label;
      return label === "greeting";
    });

    assert.ok(greetingItem, "Should find 'greeting' completion item");
    const detail = greetingItem.detail ?? "";
    assert.ok(
      detail.length > 0,
      "Completion item should have a detail with translation value",
    );
  });
});
