---
paths: "screenshots/**"
---

# Screenshot / Video Capture

- Scripts in `screenshots/` use Playwright to launch VS Code and capture screenshots/video
- `setupEnvironment()` configures user-level settings for screencast mode
- `FrameRecorder` captures PNG frames → ffmpeg converts to MP4
- Fixture projects: `screenshots/project/`, `screenshots/project-monorepo/`, `screenshots/project-namespace/`
