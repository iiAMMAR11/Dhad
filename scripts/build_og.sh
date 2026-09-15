#!/usr/bin/env bash
# Render scripts/og-card.html into the 1200x630 share card the site declares.
# Re-run it whenever the card's wording changes.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
card="$root/scripts/og-card.html"
out="$root/showcase/public/og.png"

browser=""
for candidate in \
  "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell \
  "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac*/Chromium.app/Contents/MacOS/Chromium \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"; do
  [ -x "$candidate" ] && browser="$candidate" && break
done

if [ -z "$browser" ]; then
  echo "لم أجد متصفحًا لعرض البطاقة. ثبّت أحدها ثم أعد المحاولة:" >&2
  echo "  npx playwright install chromium" >&2
  exit 1
fi

"$browser" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --screenshot="$out" "file://$card" 2>/dev/null

python3 - "$out" <<'PY'
import struct, sys, pathlib
data = pathlib.Path(sys.argv[1]).read_bytes()
width, height = struct.unpack(">II", data[16:24])
assert (width, height) == (1200, 630), f"expected 1200x630, produced {width}x{height}"
print(f"{sys.argv[1]}  {width}x{height}  {len(data) // 1024}KB")
PY
