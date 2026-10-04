#!/data/data/com.termux/files/usr/bin/bash
# Unzip a downloaded repo zip into ~/campus-qps (keeping .git) and push to GitHub.
# Usage:  bash push.sh [path-to-zip] ["commit message"]
# Default zip: newest campus-qps*.zip in ~/storage/downloads
set -e
REPO_DIR="$HOME/campus-qps"
ZIP="${1:-$(ls -t "$HOME"/storage/downloads/campus-qps*.zip 2>/dev/null | head -1)}"
MSG="${2:-chore: update from AI session}"
[ -f "$ZIP" ] || { echo "No zip found. Pass its path as the first argument."; exit 1; }

TMP="$(mktemp -d)"
unzip -q -o "$ZIP" -d "$TMP"
SRC="$TMP/campus-qps"; [ -d "$SRC" ] || SRC="$TMP"
mkdir -p "$REPO_DIR"
# copy new files over the repo; --delete would remove files you removed, but keeps .git
if command -v rsync >/dev/null; then rsync -a --exclude .git "$SRC"/ "$REPO_DIR"/; else cp -a "$SRC"/. "$REPO_DIR"/; fi
rm -rf "$TMP"

cd "$REPO_DIR"
[ -d .git ] || { git init -q; git remote add origin https://github.com/iist-oss/iist-qps.git; echo "Fresh repo. Link it once: git remote add origin https://github.com/iist-oss/iist-qps.git"; }
git add -A
if git diff --cached --quiet; then echo "Nothing changed."; else git commit -q -m "$MSG"; fi
git push -u origin HEAD 2>&1 || echo "Push failed: is the remote set? (git remote -v)"
git log --oneline | head -3
