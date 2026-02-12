import { _electron as electron } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const screenshotsDir = path.dirname(fileURLToPath(import.meta.url));
export const extensionRoot = path.resolve(screenshotsDir, "..");
export const imagesDir = path.resolve(extensionRoot, "docs", "images");
export const videosDir = path.resolve(extensionRoot, "docs", "videos");

const config = { typeDelay: 0 };

/** Override default typing delay for all helper functions. */
export function configure(opts) {
  Object.assign(config, opts);
}

/** Type text: insertText (instant) when typeDelay=0, keyboard.type otherwise. */
async function typeText(window, text) {
  if (config.typeDelay > 0) {
    await window.keyboard.type(text, { delay: config.typeDelay });
  } else {
    await window.keyboard.insertText(text);
  }
}

export function resolveVSCodeBinary() {
  const vscodeTestDir = path.join(extensionRoot, ".vscode-test");
  const entries = fs
    .readdirSync(vscodeTestDir)
    .filter((e) => e.startsWith("vscode-"));
  if (entries.length === 0) {
    throw new Error(
      "No VS Code installation found in .vscode-test/. Run 'pnpm test:e2e' first.",
    );
  }
  entries.sort();
  const latest = entries[entries.length - 1];

  if (process.platform === "darwin") {
    return path.join(
      vscodeTestDir,
      latest,
      "Visual Studio Code.app",
      "Contents",
      "MacOS",
      "Electron",
    );
  } else if (process.platform === "linux") {
    return path.join(vscodeTestDir, latest, "code");
  }
  return path.join(vscodeTestDir, latest, "Code.exe");
}

function resolveVSCodeCLI() {
  const vscodeTestDir = path.join(extensionRoot, ".vscode-test");
  const entries = fs
    .readdirSync(vscodeTestDir)
    .filter((e) => e.startsWith("vscode-"));
  entries.sort();
  const latest = entries[entries.length - 1];

  if (process.platform === "darwin") {
    return path.join(
      vscodeTestDir,
      latest,
      "Visual Studio Code.app",
      "Contents",
      "Resources",
      "app",
      "bin",
      "code",
    );
  }
  return path.join(vscodeTestDir, latest, "bin", "code");
}

export function setupEnvironment({ extensions = [] } = {}) {
  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(videosDir, { recursive: true });

  const codePath = resolveVSCodeBinary();
  console.log(`Using VS Code binary: ${codePath}`);

  const userDataDir = path.join(screenshotsDir, ".tmp-user-data");
  if (fs.existsSync(userDataDir)) fs.rmSync(userDataDir, { recursive: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  const userSettingsDir = path.join(userDataDir, "User");
  fs.mkdirSync(userSettingsDir, { recursive: true });
  fs.writeFileSync(
    path.join(userSettingsDir, "settings.json"),
    JSON.stringify({
      "workbench.secondarySideBar.visible": false,
      "workbench.auxiliaryBar.visible": false,
      "chat.commandCenter.enabled": false,
      "chat.editor.enabled": false,
      "workbench.startupEditor": "none",
      "workbench.tips.enabled": false,
    }),
  );

  if (extensions.length > 0) {
    const codeCLI = resolveVSCodeCLI();
    for (const ext of extensions) {
      console.log(`Installing extension: ${ext}...`);
      try {
        execSync(
          `"${codeCLI}" --user-data-dir="${userDataDir}" --install-extension ${ext}`,
          { stdio: "pipe", timeout: 60000 },
        );
        console.log(`  Installed: ${ext}`);
      } catch (e) {
        console.warn(`  Failed to install ${ext}: ${e.message}`);
      }
    }
  }

  return { codePath, userDataDir };
}

export async function launchVSCode(projectDir, { codePath, userDataDir }) {
  const app = await electron.launch({
    executablePath: codePath,
    args: [
      `--extensionDevelopmentPath=${extensionRoot}`,
      `--user-data-dir=${userDataDir}`,
      "--skip-welcome",
      "--skip-release-notes",
      "--disable-workspace-trust",
      projectDir,
    ],
    env: { ...process.env, DONT_PROMPT_WSL_INSTALL: "1" },
    timeout: 30000,
  });

  const window = await app.firstWindow();
  console.log("VS Code window opened");
  await window.waitForLoadState("domcontentloaded");

  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setSize(1920, 1080);
    win.center();
  });
  await window.waitForTimeout(2500);

  await runCommand(window, "Notifications: Clear All");
  await window.keyboard.press("Escape");
  await window.waitForTimeout(100);

  const visible = await window.evaluate(() => {
    const auxBar = document.querySelector(".part.auxiliarybar");
    return auxBar != null && auxBar.offsetWidth > 0;
  });
  if (visible) {
    await window.keyboard.press("Meta+Alt+b");
    await window.waitForTimeout(100);
  }

  return { app, window };
}

export async function openFile(window, filename) {
  await window.keyboard.press("Meta+p");
  await window.waitForTimeout(300);
  await typeText(window, filename);
  await window.waitForTimeout(300);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(1000);
}

export async function runCommand(window, name) {
  await window.keyboard.press("Meta+Shift+p");
  await window.waitForTimeout(200);
  await typeText(window, name);
  await window.waitForTimeout(200);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(300);
}

/**
 * Go to line or line:column using Ctrl+G.
 * @param {string|number} position - e.g. "9" or "9:17"
 */
export async function goTo(window, position) {
  await window.keyboard.press("Control+g");
  await window.waitForTimeout(150);
  await typeText(window, String(position));
  await window.keyboard.press("Enter");
  await window.waitForTimeout(200);
}

export async function selectDecorationMode(window, filterText) {
  await runCommand(window, "JS I18n: Select Decoration Mode");
  await window.waitForTimeout(500);
  if (filterText) {
    await typeText(window, filterText);
    await window.waitForTimeout(200);
  }
  await window.keyboard.press("Enter");
  await window.waitForTimeout(1000);
}
