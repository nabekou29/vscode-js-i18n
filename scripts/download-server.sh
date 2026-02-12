#!/bin/bash
set -euo pipefail

VERSION="${1:?Usage: $0 <version> <vscode-target>}"
TARGET="${2:?Usage: $0 <version> <vscode-target>}"

case "$TARGET" in
  darwin-arm64)  SERVER_TARGET="aarch64-apple-darwin" ;;
  darwin-x64)    SERVER_TARGET="x86_64-apple-darwin" ;;
  linux-arm64)   SERVER_TARGET="aarch64-unknown-linux-gnu" ;;
  linux-x64)     SERVER_TARGET="x86_64-unknown-linux-gnu" ;;
  win32-x64)     SERVER_TARGET="x86_64-pc-windows-msvc" ;;
  *)             echo "Unsupported target: $TARGET" >&2; exit 1 ;;
esac

REPO="nabekou29/js-i18n-language-server"
BASE_URL="https://github.com/$REPO/releases/download/v$VERSION"
NAME="js-i18n-language-server"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$PROJECT_DIR/server"

rm -rf "$SERVER_DIR"
mkdir -p "$SERVER_DIR"

if [[ "$TARGET" == win32-* ]]; then
  ARCHIVE="$NAME-$SERVER_TARGET.zip"
  curl -fL "$BASE_URL/$ARCHIVE" -o "/tmp/$ARCHIVE"
  TMPDIR_EXTRACT=$(mktemp -d)
  unzip -o "/tmp/$ARCHIVE" -d "$TMPDIR_EXTRACT"
  # Flatten: move contents from subdirectory if present
  SUBDIR="$TMPDIR_EXTRACT/$NAME-$SERVER_TARGET"
  if [[ -d "$SUBDIR" ]]; then
    cp -a "$SUBDIR"/* "$SERVER_DIR/"
  else
    cp -a "$TMPDIR_EXTRACT"/* "$SERVER_DIR/"
  fi
  rm -rf "$TMPDIR_EXTRACT" "/tmp/$ARCHIVE"
else
  ARCHIVE="$NAME-$SERVER_TARGET.tar.xz"
  curl -fL "$BASE_URL/$ARCHIVE" -o "/tmp/$ARCHIVE"
  tar xJf "/tmp/$ARCHIVE" -C "$SERVER_DIR" --strip-components=1
  chmod +x "$SERVER_DIR/$NAME"
  rm "/tmp/$ARCHIVE"
fi

echo "Server binary downloaded to $SERVER_DIR"
ls -la "$SERVER_DIR/$NAME"*
