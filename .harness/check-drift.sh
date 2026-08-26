#!/bin/sh
# Drift gate (VendKit "gate lane" pattern, self-hosted). Two checks:
#  1. the vendored .harness/ tree hashes to what .harness/MANIFEST pins
#  2. the repo .gitignore's harness-managed block matches gitignore.base
# Runs in every consumer repo's CI and locally via `just harness-check`.
set -eu
HARNESS_DIR="${1:-.harness}"
MANIFEST="$HARNESS_DIR/MANIFEST"
[ -f "$MANIFEST" ] || { echo "FAIL: $MANIFEST missing — run scripts/sync.sh"; exit 1; }
pinned=$(sed -n 's/^tree_sha256: //p' "$MANIFEST")
actual=$(cd "$HARNESS_DIR" && find . -type f ! -name MANIFEST -print0 \
  | sort -z | xargs -0 shasum -a 256 | shasum -a 256 | cut -d' ' -f1)
if [ "$pinned" != "$actual" ]; then
  echo "FAIL: .harness/ drifted from pinned $(sed -n 's/^version: //p' "$MANIFEST")"
  echo "  pinned:  $pinned"
  echo "  actual:  $actual"
  echo "Hand-edits to .harness/ cannot merge — change efficient-harness upstream."
  exit 1
fi
GI="$(dirname "$HARNESS_DIR")/.gitignore"
if [ -f "$HARNESS_DIR/gitignore.base" ]; then
  block=$(sed -n '/^# BEGIN harness-managed/,/^# END harness-managed/p' "$GI" 2>/dev/null || true)
  want=$(cat "$HARNESS_DIR/gitignore.base")
  if [ "$block" != "$want" ]; then
    echo "FAIL: .gitignore harness-managed block missing or edited — run sync.sh"
    exit 1
  fi
fi
echo "OK: .harness/ matches $(sed -n 's/^version: //p' "$MANIFEST")"
