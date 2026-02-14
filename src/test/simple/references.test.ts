import * as assert from "assert";
import {
  openDocument,
  getFixtureUri,
  waitForServerReady,
  getPosition,
  getReferences,
} from "../helpers";

suite("References", () => {
  suiteSetup(async () => {
    await waitForServerReady();
  });

  test("find references for 'greeting' key includes app.tsx", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);

    const position = getPosition(doc, '"greeting"', 1);
    const locations = await getReferences(uri, position);

    assert.ok(locations.length > 0, "Should return at least one reference");

    const appRef = locations.find((loc) =>
      loc.uri.fsPath.endsWith("app.tsx"),
    );
    assert.ok(appRef, "References should include app.tsx");
  });

  test("find references returns at least source file usage", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);

    const position = getPosition(doc, '"greeting"', 1);
    const locations = await getReferences(uri, position);

    // References should include the source file where the key is used
    assert.ok(
      locations.length >= 1,
      `Should return at least 1 reference, got ${locations.length}`,
    );
  });
});
