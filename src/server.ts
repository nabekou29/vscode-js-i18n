import * as path from "path";
import * as fs from "fs";
import { workspace } from "vscode";

const SERVER_NAME = "js-i18n-language-server";

export function resolveServerPath(): string {
  const configPath = workspace
    .getConfiguration("js-i18n")
    .get<string>("serverPath");
  if (configPath && fs.existsSync(configPath)) {
    return configPath;
  }

  const nativeBinDir = path.join(
    __dirname,
    "..",
    "node_modules",
    SERVER_NAME,
    "bin",
  );
  if (fs.existsSync(nativeBinDir)) {
    const entries = fs.readdirSync(nativeBinDir);
    const bin = entries.find((e) => e.startsWith(SERVER_NAME));
    if (bin) {
      return path.join(nativeBinDir, bin);
    }
  }

  const binWrapper = path.join(
    __dirname,
    "..",
    "node_modules",
    ".bin",
    SERVER_NAME,
  );
  if (fs.existsSync(binWrapper)) {
    return binWrapper;
  }

  const bundledBin = path.join(
    __dirname,
    "..",
    "server",
    process.platform === "win32" ? `${SERVER_NAME}.exe` : SERVER_NAME,
  );
  if (fs.existsSync(bundledBin)) {
    return bundledBin;
  }

  return SERVER_NAME;
}
