import * as assert from "assert";
import * as vscode from "vscode";
import { activateExtension } from "../helpers";

suite("Extension Activation", () => {
  test("extension is present", () => {
    const ext = vscode.extensions.getExtension("nabekou29.js-i18n");
    assert.ok(ext, "Extension should be installed");
  });

  test("extension activates successfully", async () => {
    await activateExtension();
    const ext = vscode.extensions.getExtension("nabekou29.js-i18n")!;
    assert.strictEqual(ext.isActive, true, "Extension should be active");
  });
});
