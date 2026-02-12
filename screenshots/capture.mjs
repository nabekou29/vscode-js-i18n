import { _electron as electron } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(__dirname, "..");
const imagesDir = path.resolve(extensionRoot, "docs", "images");
const videosDir = path.resolve(extensionRoot, "docs", "videos");
const VIDEO_FPS = 20;

fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(videosDir, { recursive: true });

function resolveVSCodeBinary() {
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
  } else {
    return path.join(vscodeTestDir, latest, "Code.exe");
  }
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
  } else {
    return path.join(vscodeTestDir, latest, "bin", "code");
  }
}

// --- Video frame capture helper ---
class FrameRecorder {
  constructor(page) {
    this.page = page;
    this.frames = [];
    this.recording = false;
    this.capturing = false;
    this.intervalId = null;
    this.startTime = null;
    this.stopTime = null;
  }

  start(intervalMs) {
    this.recording = true;
    this.startTime = Date.now();
    this.intervalId = setInterval(async () => {
      if (!this.recording || this.capturing) return;
      this.capturing = true;
      try {
        const buf = await this.page.screenshot({ type: "png" });
        this.frames.push(buf);
      } catch {
        // Page may be closing
      } finally {
        this.capturing = false;
      }
    }, intervalMs);
  }

  stop() {
    this.recording = false;
    this.stopTime = Date.now();
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /** Actual framerate based on elapsed time */
  get actualFps() {
    const elapsed = (this.stopTime - this.startTime) / 1000;
    return this.frames.length / elapsed;
  }

  save(dir) {
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < this.frames.length; i++) {
      fs.writeFileSync(
        path.join(dir, `frame-${String(i).padStart(5, "0")}.png`),
        this.frames[i],
      );
    }
    return this.frames.length;
  }
}

// --- Common helpers ---

const EXTENSIONS = ["usernamehw.errorlens"];
const codePath = resolveVSCodeBinary();
console.log(`Using VS Code binary: ${codePath}`);

// Fresh user data dir every run
const userDataDir = path.join(__dirname, ".tmp-user-data");
if (fs.existsSync(userDataDir)) {
  fs.rmSync(userDataDir, { recursive: true });
}
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

// Install additional extensions
if (EXTENSIONS.length > 0) {
  const { execSync } = await import("node:child_process");
  const codeCLI = resolveVSCodeCLI();
  for (const ext of EXTENSIONS) {
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

async function launchVSCode(projectDir) {
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

  // Set window size for higher resolution
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setSize(1920, 1080);
    win.center();
  });
  await window.waitForTimeout(3000);

  // Clear notifications
  await runCommand(window, "Notifications: Clear All");
  await window.keyboard.press("Escape");
  await window.waitForTimeout(300);

  // Close secondary sidebar if visible
  const visible = await window.evaluate(() => {
    const auxBar = document.querySelector(".part.auxiliarybar");
    return auxBar != null && auxBar.offsetWidth > 0;
  });
  if (visible) {
    await window.keyboard.press("Meta+Alt+b");
    await window.waitForTimeout(300);
  }

  return { app, window };
}

async function openFile(window, filename) {
  await window.keyboard.press("Meta+p");
  await window.waitForTimeout(500);
  await window.keyboard.type(filename, { delay: 50 });
  await window.waitForTimeout(500);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(2000);
}

async function runCommand(window, name) {
  await window.keyboard.press("Meta+Shift+p");
  await window.waitForTimeout(400);
  await window.keyboard.type(name, { delay: 15 });
  await window.waitForTimeout(400);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(500);
}

async function saveRecorderToMp4(recorder, outputPath) {
  const framesDir = outputPath + "-frames";
  if (fs.existsSync(framesDir)) {
    fs.rmSync(framesDir, { recursive: true });
  }
  const count = recorder.save(framesDir);
  const actualFps = recorder.actualFps.toFixed(2);
  console.log(`Captured ${count} frames (actual: ${actualFps} fps)`);

  if (count > 0) {
    const { execSync } = await import("node:child_process");
    const cmd = `ffmpeg -y -framerate ${actualFps} -i "${framesDir}/frame-%05d.png" -c:v libx264 -pix_fmt yuv420p -crf 23 -an "${outputPath}"`;
    console.log(`Converting frames to MP4...`);
    try {
      execSync(cmd, { stdio: "pipe" });
      const size = fs.statSync(outputPath).size;
      console.log(`MP4 saved: ${outputPath} (${(size / 1024).toFixed(0)} KB)`);
      fs.rmSync(framesDir, { recursive: true });
    } catch (e) {
      console.error("ffmpeg conversion failed:", e.message);
      console.log("Frames kept at:", framesDir);
    }
  }
}

// =====================================================
// 1. Main project: screenshots + video
// =====================================================
console.log("\n=== Main project (Dashboard) ===");
{
  const projectDir = path.resolve(__dirname, "project");
  const { app, window } = await launchVSCode(projectDir);

  // Open Dashboard.tsx
  console.log("Opening Dashboard.tsx...");
  await openFile(window, "Dashboard.tsx");

  // Wait for extension + LSP
  console.log("Waiting for extension to activate and LSP to start...");
  await window.waitForTimeout(2000);

  // Go to top
  await window.keyboard.press("Meta+Home");
  await window.waitForTimeout(1000);

  // --- Screenshots ---

  // Screenshot 1: Inline translations
  console.log("Capturing inline-translations screenshot...");
  await window.screenshot({
    path: path.join(imagesDir, "inline-translations.png"),
  });

  // Screenshot 2: Diagnostics
  console.log("Capturing diagnostics screenshot...");
  await window.keyboard.press("Meta+Shift+m");
  await window.waitForTimeout(2000);
  await window.screenshot({ path: path.join(imagesDir, "diagnostics.png") });
  // Close Problems panel
  await window.keyboard.press("Meta+j");
  await window.waitForTimeout(500);

  // Screenshot 3: Language switcher
  console.log("Capturing language-switcher screenshot...");
  await window.keyboard.press("Meta+Shift+p");
  await window.waitForTimeout(500);
  await window.keyboard.type("JS I18n: Select Language", { delay: 30 });
  await window.waitForTimeout(1000);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(1500);
  await window.screenshot({
    path: path.join(imagesDir, "language-switcher.png"),
  });
  // Dismiss QuickPick
  await window.keyboard.press("Escape");
  await window.waitForTimeout(500);

  // --- Video recording ---
  console.log("Starting video capture...");
  const recorder = new FrameRecorder(window);
  recorder.start(Math.round(1000 / VIDEO_FPS));

  // Scene 1: Show inline translations (en)
  await window.keyboard.press("Meta+Home");
  await window.waitForTimeout(2500);

  // Scene 2: Move cursor to a translation line → key reveals
  await window.keyboard.press("Control+g");
  await window.waitForTimeout(300);
  await window.keyboard.type("9", { delay: 100 });
  await window.keyboard.press("Enter");
  await window.waitForTimeout(2500);

  // Scene 3: Move cursor away → translation shows again
  await window.keyboard.press("Control+g");
  await window.waitForTimeout(300);
  await window.keyboard.type("1", { delay: 100 });
  await window.keyboard.press("Enter");
  await window.waitForTimeout(2500);

  // Scene 4: Switch to Japanese
  await window.keyboard.press("Meta+Shift+p");
  await window.waitForTimeout(500);
  await window.keyboard.type("JS I18n: Select Language", { delay: 30 });
  await window.waitForTimeout(500);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(1000);
  await window.keyboard.type("ja", { delay: 100 });
  await window.waitForTimeout(300);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(4000);

  // Scene 5: Pause on Japanese translations
  await window.waitForTimeout(2000);

  // Scene 6: Edit a translation (dashboard.welcome on line 20, col 20)
  console.log("Scene 6: Edit translation...");
  await window.keyboard.press("Control+g");
  await window.waitForTimeout(300);
  await window.keyboard.type("20:20", { delay: 100 });
  await window.keyboard.press("Enter");
  await window.waitForTimeout(1000);

  // Run Edit Translation command
  await window.keyboard.press("Meta+Shift+p");
  await window.waitForTimeout(500);
  await window.keyboard.type("JS I18n: Edit Translation", { delay: 30 });
  await window.waitForTimeout(500);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(1500);

  // Select language: ja
  await window.keyboard.type("ja", { delay: 100 });
  await window.waitForTimeout(300);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(1500);

  // InputBox appears with current value — select all and type new value
  await window.keyboard.press("Meta+a");
  await window.waitForTimeout(200);
  await window.keyboard.type("ようこそ、Alex！", { delay: 50 });
  await window.waitForTimeout(1500);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(500);
  await window.keyboard.press("Control+g");
  await window.waitForTimeout(300);
  await window.keyboard.type("1", { delay: 100 });
  await window.keyboard.press("Enter");
  await window.waitForTimeout(3000);

  // Scene 7: Pause to show updated translation
  await window.waitForTimeout(2000);

  recorder.stop();
  await saveRecorderToMp4(recorder, path.join(videosDir, "demo.mp4"));

  // --- Decoration mode switching video ---
  console.log("\nStarting decoration mode switching video...");

  // Switch back to English first
  await runCommand(window, "JS I18n: Select Language");
  await window.waitForTimeout(1000);
  await window.keyboard.type("en", { delay: 100 });
  await window.waitForTimeout(300);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(3000);

  await window.keyboard.press("Meta+Home");
  await window.waitForTimeout(1000);

  const modeRecorder = new FrameRecorder(window);
  modeRecorder.start(Math.round(1000 / VIDEO_FPS));

  // Scene 1: Show current mode (Replace + inline on cursor line)
  await window.waitForTimeout(2000);

  // Move cursor to a translation line to show inline behavior
  await window.keyboard.press("Control+g");
  await window.waitForTimeout(300);
  await window.keyboard.type("9", { delay: 100 });
  await window.keyboard.press("Enter");
  await window.waitForTimeout(2500);

  // Scene 2: Switch to "Inline" mode
  await runCommand(window, "JS I18n: Select Decoration Mode");
  await window.waitForTimeout(1000);
  await window.keyboard.type("Inline", { delay: 50 });
  await window.waitForTimeout(500);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(3000);

  // Scene 3: Move cursor around to show inline mode doesn't change
  await window.keyboard.press("Control+g");
  await window.waitForTimeout(300);
  await window.keyboard.type("20", { delay: 100 });
  await window.keyboard.press("Enter");
  await window.waitForTimeout(2500);

  // Scene 4: Switch to "Replace (hide on cursor line)"
  await runCommand(window, "JS I18n: Select Decoration Mode");
  await window.waitForTimeout(1000);
  await window.keyboard.type("hide", { delay: 50 });
  await window.waitForTimeout(500);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(3000);

  // Move cursor to show hide behavior
  await window.keyboard.press("Control+g");
  await window.waitForTimeout(300);
  await window.keyboard.type("9", { delay: 100 });
  await window.keyboard.press("Enter");
  await window.waitForTimeout(2500);

  // Scene 5: Switch back to default "Replace (inline on cursor line)"
  await runCommand(window, "JS I18n: Select Decoration Mode");
  await window.waitForTimeout(1000);
  await window.keyboard.press("Enter"); // First item is the default
  await window.waitForTimeout(3000);

  // Move cursor to show inline-on-cursor behavior
  await window.keyboard.press("Control+g");
  await window.waitForTimeout(300);
  await window.keyboard.type("9", { delay: 100 });
  await window.keyboard.press("Enter");
  await window.waitForTimeout(2500);

  modeRecorder.stop();
  await saveRecorderToMp4(
    modeRecorder,
    path.join(videosDir, "decoration-modes.mp4"),
  );

  console.log("Closing VS Code...");
  await app.close();
}

// =====================================================
// 2. Namespace project: screenshot
// =====================================================
console.log("\n=== Namespace project ===");
{
  const projectDir = path.resolve(__dirname, "project-namespace");
  const { app, window } = await launchVSCode(projectDir);

  console.log("Opening ProductPage.tsx...");
  await openFile(window, "ProductPage.tsx");

  console.log("Waiting for LSP...");
  await window.waitForTimeout(5000);

  await window.keyboard.press("Meta+Home");
  await window.waitForTimeout(1000);

  console.log("Capturing namespace screenshot...");
  await window.screenshot({ path: path.join(imagesDir, "namespace.png") });

  console.log("Closing VS Code...");
  await app.close();
}

// =====================================================
// 3. Monorepo project: screenshot (split editor)
// =====================================================
console.log("\n=== Monorepo project ===");
{
  const projectDir = path.resolve(__dirname, "project-monorepo");
  const { app, window } = await launchVSCode(projectDir);

  // Open web App.tsx
  console.log("Opening web/App.tsx...");
  await openFile(window, "App.tsx");

  console.log("Waiting for LSP...");
  await window.waitForTimeout(5000);

  // Split editor
  await window.keyboard.press("Meta+\\");
  await window.waitForTimeout(500);

  // Open admin Dashboard.tsx in the second pane
  console.log("Opening admin/Dashboard.tsx...");
  await openFile(window, "Dashboard.tsx");
  await window.waitForTimeout(3000);

  console.log("Capturing monorepo screenshot...");
  await window.screenshot({ path: path.join(imagesDir, "monorepo.png") });

  console.log("Closing VS Code...");
  await app.close();
}

console.log("\nDone! Screenshots saved to docs/images/");
