import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import {
  configure,
  setupEnvironment,
  launchVSCode,
  openFile,
  runCommand,
  goTo,
  screenshotsDir,
  videosDir,
} from "./helpers.mjs";

configure({ typeDelay: 15 });

const VIDEO_FPS = 20;

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

async function saveRecorderToMp4(recorder, outputPath) {
  const framesDir = outputPath + "-frames";
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
  const count = recorder.save(framesDir);
  const actualFps = recorder.actualFps.toFixed(2);
  console.log(`Captured ${count} frames (actual: ${actualFps} fps)`);

  if (count > 0) {
    const cmd = `ffmpeg -y -framerate ${actualFps} -i "${framesDir}/frame-%05d.png" -c:v libx264 -pix_fmt yuv420p -crf 23 -an "${outputPath}"`;
    console.log("Converting frames to MP4...");
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

const env = setupEnvironment({ extensions: ["usernamehw.errorlens"] });

console.log("\n=== Recording demo video ===");
const projectDir = path.resolve(screenshotsDir, "project");
const { app, window } = await launchVSCode(projectDir, env);

console.log("Opening Dashboard.tsx...");
await openFile(window, "Dashboard.tsx");
console.log("Waiting for LSP...");
await window.waitForTimeout(3000);

// Enable Screencast Mode to show keyboard shortcuts overlay
await runCommand(window, "Developer: Toggle Screencast Mode");
await window.waitForTimeout(500);

const recorder = new FrameRecorder(window);
recorder.start(Math.round(1000 / VIDEO_FPS));

await window.waitForTimeout(1000);

// Scene 1: Switch to Japanese
await window.keyboard.press("Meta+Shift+p");
await window.waitForTimeout(500);
await window.keyboard.type("js-i18n: Select Language", { delay: 15 });
await window.waitForTimeout(500);
await window.keyboard.press("Enter");
await window.waitForTimeout(1000);
await window.keyboard.type("ja", { delay: 50 });
await window.waitForTimeout(300);
await window.keyboard.press("Enter");
await window.waitForTimeout(1000);

// Scene 2: Pause on Japanese translations
await window.waitForTimeout(2000);

// Scene 3: Go to Definition
console.log("Scene 3: Go to Definition...");
await goTo(window, "9:20"); // cursor on "app.title"
await window.waitForTimeout(1000);
await window.keyboard.press("F12");
await window.waitForTimeout(1000);
await window.keyboard.press("Enter");
await window.waitForTimeout(2500);

// Scene 4: Find References
console.log("Scene 4: Find References...");
await window.keyboard.press("Shift+F12");
await window.waitForTimeout(2500);
await window.keyboard.press("Escape");
await window.waitForTimeout(1000);

// Scene 5: Edit a translation
console.log("Scene 5: Edit translation...");
await goTo(window, "20:20");
await window.waitForTimeout(1000);

await window.keyboard.press("Meta+Shift+p");
await window.waitForTimeout(500);
await window.keyboard.type("js-i18n: Edit Translation", { delay: 15 });
await window.waitForTimeout(500);
await window.keyboard.press("Enter");
await window.waitForTimeout(1500);

// Select language: ja
await window.keyboard.type("ja", { delay: 50 });
await window.waitForTimeout(300);
await window.keyboard.press("Enter");
await window.waitForTimeout(1500);

// InputBox appears with current value — select all and type new value
await window.keyboard.press("Meta+a");
await window.waitForTimeout(200);
await window.keyboard.type("ようこそ、Alex！", { delay: 30 });
await window.waitForTimeout(1500);
await window.keyboard.press("Enter");
await window.waitForTimeout(500);
await goTo(window, "1");
await window.waitForTimeout(3000);

// Scene 6: Pause to show updated translation
await window.waitForTimeout(2000);

recorder.stop();
await saveRecorderToMp4(recorder, path.join(videosDir, "demo.mp4"));

console.log("Closing VS Code...");
await app.close();
console.log("\nDone! Video saved to docs/videos/");
