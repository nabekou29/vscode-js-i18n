import * as assert from "assert";
import {
  activateExtension,
  openDocument,
  getFixtureUri,
  waitForDiagnostics,
  i18nFilter,
} from "../helpers";

suite("Monorepo Diagnostics", () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test("reports missing translation in app-a", async () => {
    const uri = getFixtureUri("monorepo", "packages/app-a/src/index.tsx");
    await openDocument(uri);
    const diagnostics = await waitForDiagnostics(uri, {
      filter: i18nFilter,
      minCount: 1,
    });

    const farewellDiag = diagnostics.find((d) =>
      d.message.includes("farewell"),
    );
    assert.ok(
      farewellDiag,
      'Should report missing translation for "farewell" in app-a',
    );
  });

  test("reports missing translation in app-b", async () => {
    const uri = getFixtureUri("monorepo", "packages/app-b/src/index.tsx");
    await openDocument(uri);
    const diagnostics = await waitForDiagnostics(uri, {
      filter: i18nFilter,
      minCount: 1,
    });

    const logoutDiag = diagnostics.find((d) => d.message.includes("logout"));
    assert.ok(
      logoutDiag,
      'Should report missing translation for "logout" in app-b',
    );
  });

  test("does NOT report duplicate languages in app-a diagnostics", async () => {
    const uri = getFixtureUri("monorepo", "packages/app-a/src/index.tsx");
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
          `Duplicate languages in app-a: "${diag.message}"`,
        );
      }
    }
  });

  test("does NOT report duplicate languages in app-b diagnostics", async () => {
    const uri = getFixtureUri("monorepo", "packages/app-b/src/index.tsx");
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
          `Duplicate languages in app-b: "${diag.message}"`,
        );
      }
    }
  });
});
