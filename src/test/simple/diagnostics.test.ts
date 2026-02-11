import * as assert from "assert";
import {
  activateExtension,
  openDocument,
  getFixtureUri,
  waitForDiagnostics,
  i18nFilter,
} from "../helpers";

suite("Diagnostics", () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test("reports missing translation for key absent in ja.json", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    await openDocument(uri);
    const diagnostics = await waitForDiagnostics(uri, {
      filter: i18nFilter,
      minCount: 1,
    });

    const farewellDiag = diagnostics.find((d) =>
      d.message.includes("farewell"),
    );
    assert.ok(farewellDiag, 'Should report missing translation for "farewell"');
  });

  test("reports missing translation for completely absent key", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    await openDocument(uri);
    const diagnostics = await waitForDiagnostics(uri, {
      filter: i18nFilter,
      minCount: 1,
    });

    const nonexistentDiag = diagnostics.find((d) =>
      d.message.includes("nonexistent"),
    );
    assert.ok(
      nonexistentDiag,
      'Should report missing translation for "nonexistent"',
    );
  });

  test("does NOT report duplicate languages in diagnostic messages", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    await openDocument(uri);
    const diagnostics = await waitForDiagnostics(uri, {
      filter: i18nFilter,
      minCount: 1,
    });

    for (const diag of diagnostics) {
      const match = diag.message.match(/missing (?:for|in):?\s*(.*)/i);
      if (match) {
        const languages = match[1].split(/,\s*/);
        const unique = new Set(languages);
        assert.strictEqual(
          languages.length,
          unique.size,
          `Duplicate languages in: "${diag.message}"`,
        );
      }
    }
  });

  test("no missing translation diagnostic for key present in all languages", async () => {
    const uri = getFixtureUri("simple", "src/app.tsx");
    await openDocument(uri);
    await waitForDiagnostics(uri, { filter: i18nFilter, minCount: 1 });

    const diagnostics = (
      await waitForDiagnostics(uri, { filter: i18nFilter })
    ).filter((d) => d.message.includes("greeting"));

    assert.strictEqual(
      diagnostics.length,
      0,
      '"greeting" should not have missing translation diagnostics',
    );
  });
});
