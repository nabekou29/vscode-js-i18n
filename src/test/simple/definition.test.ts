import * as assert from "assert";
import {
  openDocument,
  getFixtureUri,
  waitForServerReady,
  getPosition,
  getDefinitions,
} from "../helpers";

suite("Definition", () => {
  suiteSetup(async () => {
    await waitForServerReady();
  });

  test("go-to-definition from t('greeting') navigates to JSON file", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);

    const position = getPosition(doc, '"greeting"', 1);
    const locations = await getDefinitions(uri, position);

    assert.ok(locations.length > 0, "Should return at least one definition");

    const jsonLocations = locations.filter((loc) =>
      loc.uri.fsPath.includes("locales"),
    );
    assert.ok(
      jsonLocations.length > 0,
      "Definition should point to a file in locales/",
    );
  });

  test("go-to-definition from t('farewell') points to en.json", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    const doc = await openDocument(uri);

    const position = getPosition(doc, '"farewell"', 1);
    const locations = await getDefinitions(uri, position);

    assert.ok(locations.length > 0, "Should return at least one definition");

    const enLocation = locations.find((loc) =>
      loc.uri.fsPath.endsWith("en.json"),
    );
    assert.ok(
      enLocation,
      "farewell definition should include en.json",
    );
  });
});
