import * as assert from "assert";
import * as vscode from "vscode";
import {
  openDocument,
  getFixtureUri,
  waitForServerReady,
  getPosition,
  waitForHover,
  hoverContentsToString,
} from "../helpers";

suite("Hover", () => {
  let doc: vscode.TextDocument;
  const uri = getFixtureUri("simple", "src/app.tsx");

  suiteSetup(async () => {
    await waitForServerReady();
    doc = await openDocument(uri);
  });

  test("hover over t('greeting') shows en and ja values", async () => {
    const position = getPosition(doc, '"greeting"', 1);
    const hovers = await waitForHover(uri, position);

    assert.ok(hovers.length > 0, "Should return hover data");
    const text = hovers.map(hoverContentsToString).join("\n");
    assert.ok(text.includes("Hello"), "Hover should contain en value 'Hello'");
    assert.ok(
      text.includes("こんにちは"),
      "Hover should contain ja value 'こんにちは'",
    );
  });

  test("hover over t('farewell') shows en value", async () => {
    const position = getPosition(doc, '"farewell"', 1);
    const hovers = await waitForHover(uri, position);

    assert.ok(hovers.length > 0, "Should return hover data");
    const text = hovers.map(hoverContentsToString).join("\n");
    assert.ok(
      text.includes("Goodbye"),
      "Hover should contain en value 'Goodbye'",
    );
  });

  test("hover outside translation key returns no i18n hover", async () => {
    const position = getPosition(doc, "<div>", 1);
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      "vscode.executeHoverProvider",
      uri,
      position,
    );
    const text = (hovers ?? []).map(hoverContentsToString).join("\n");
    assert.ok(
      !text.includes("Hello") && !text.includes("Goodbye"),
      "Non-key position should not show translation hovers",
    );
  });
});
