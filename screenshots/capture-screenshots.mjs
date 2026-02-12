import path from "node:path";
import {
  setupEnvironment,
  launchVSCode,
  openFile,
  runCommand,
  goTo,
  selectDecorationMode,
  screenshotsDir,
  imagesDir,
} from "./helpers.mjs";

const env = setupEnvironment({ extensions: ["usernamehw.errorlens"] });

// =====================================================
// 1. Main project
// =====================================================
console.log("\n=== Main project ===");
{
  const projectDir = path.resolve(screenshotsDir, "project");
  const { app, window } = await launchVSCode(projectDir, env);

  console.log("Opening Dashboard.tsx...");
  await openFile(window, "Dashboard.tsx");
  console.log("Waiting for LSP...");
  await window.waitForTimeout(1000);
  await window.keyboard.press("Meta+Home");
  await window.waitForTimeout(200);

  // --- inline-translations ---
  console.log("Capturing inline-translations...");
  await window.screenshot({
    path: path.join(imagesDir, "inline-translations.png"),
  });

  // --- completion ---
  // Line 9: `        <h1>{t("app.title")}</h1>`
  // "app.title" starts at col 17, length 9
  console.log("Capturing completion...");
  await goTo(window, "9:17");
  for (let i = 0; i < 9; i++) {
    await window.keyboard.press("Shift+ArrowRight");
  }
  await window.keyboard.press("Delete");
  await window.waitForTimeout(200);
  await window.keyboard.press("Control+Space");
  await window.waitForTimeout(1000);
  await window.screenshot({ path: path.join(imagesDir, "completion.png") });
  await window.keyboard.press("Escape");
  await window.keyboard.press("Meta+z");
  await window.waitForTimeout(200);

  // --- hover ---
  console.log("Capturing hover...");
  await goTo(window, "9:20");
  await runCommand(window, "Show Hover");
  await window.waitForTimeout(1000);
  await window.screenshot({ path: path.join(imagesDir, "hover.png") });
  await window.keyboard.press("Escape");
  await window.waitForTimeout(200);

  // --- decoration modes ---
  console.log("Capturing decoration modes...");

  // Replace + Inline (default)
  await goTo(window, "9");
  await window.waitForTimeout(300);
  await window.screenshot({
    path: path.join(imagesDir, "decoration-replace-inline.png"),
  });

  // Replace + Hide
  await selectDecorationMode(window, "hide");
  await goTo(window, "9");
  await window.waitForTimeout(300);
  await window.screenshot({
    path: path.join(imagesDir, "decoration-replace-hide.png"),
  });

  // Inline
  await selectDecorationMode(window, "Inline");
  await goTo(window, "9");
  await window.waitForTimeout(300);
  await window.screenshot({
    path: path.join(imagesDir, "decoration-inline.png"),
  });

  // Back to default for remaining captures
  await selectDecorationMode(window);

  // --- diagnostics ---
  console.log("Capturing diagnostics...");
  await window.keyboard.press("Meta+Home");
  await window.waitForTimeout(200);
  await window.keyboard.press("Meta+Shift+m");
  await window.waitForTimeout(1000);
  await window.screenshot({ path: path.join(imagesDir, "diagnostics.png") });
  await window.keyboard.press("Meta+j");
  await window.waitForTimeout(200);

  // --- unused diagnostics ---
  console.log("Capturing unused-diagnostics...");
  await openFile(window, "en.json");
  await window.waitForTimeout(1000);
  await window.keyboard.press("Meta+Home");
  await window.waitForTimeout(300);
  await window.screenshot({
    path: path.join(imagesDir, "unused-diagnostics.png"),
  });

  // --- key prefix ---
  console.log("Capturing key-prefix...");
  await selectDecorationMode(window, "Inline");
  await openFile(window, "StatsPanel.tsx");
  await runCommand(window, "View: Close Other Editors in Group");
  await window.waitForTimeout(1000);
  await window.keyboard.press("Meta+Home");
  await window.waitForTimeout(300);
  await window.keyboard.press("Meta+\\");
  await window.waitForTimeout(200);
  await openFile(window, "en.json");
  await runCommand(window, "View: Close Other Editors in Group");
  await window.waitForTimeout(1000);
  await window.screenshot({ path: path.join(imagesDir, "key-prefix.png") });
  await window.keyboard.press("Meta+w");
  await window.waitForTimeout(200);

  console.log("Closing VS Code...");
  await app.close();
}

// =====================================================
// 2. Namespace project
// =====================================================
console.log("\n=== Namespace project ===");
{
  const projectDir = path.resolve(screenshotsDir, "project-namespace");
  const { app, window } = await launchVSCode(projectDir, env);

  console.log("Opening ProductPage.tsx...");
  await openFile(window, "ProductPage.tsx");
  console.log("Waiting for LSP...");
  await window.waitForTimeout(1000);
  await window.keyboard.press("Meta+Home");
  await window.waitForTimeout(300);

  await window.keyboard.press("Meta+\\");
  await window.waitForTimeout(200);
  await openFile(window, "common.json");
  await runCommand(window, "View: Close Other Editors in Group");
  await window.waitForTimeout(1000);

  await runCommand(window, "View: Split Editor Down");
  await window.waitForTimeout(200);
  await openFile(window, "product.json");
  await runCommand(window, "View: Close Other Editors in Group");
  await window.waitForTimeout(1000);

  console.log("Capturing namespace...");
  await window.screenshot({ path: path.join(imagesDir, "namespace.png") });

  console.log("Closing VS Code...");
  await app.close();
}

// =====================================================
// 3. Monorepo project
// =====================================================
console.log("\n=== Monorepo project ===");
{
  const projectDir = path.resolve(screenshotsDir, "project-monorepo");
  const { app, window } = await launchVSCode(projectDir, env);

  console.log("Opening web/App.tsx...");
  await openFile(window, "App.tsx");
  console.log("Waiting for LSP...");
  await window.waitForTimeout(3000);

  await window.keyboard.press("Meta+\\");
  await window.waitForTimeout(200);
  console.log("Opening admin/Dashboard.tsx...");
  await openFile(window, "Dashboard.tsx");
  await runCommand(window, "View: Close Other Editors in Group");
  await window.waitForTimeout(1500);

  console.log("Capturing monorepo...");
  await window.screenshot({ path: path.join(imagesDir, "monorepo.png") });

  console.log("Closing VS Code...");
  await app.close();
}

console.log("\nDone! Screenshots saved to docs/images/");
