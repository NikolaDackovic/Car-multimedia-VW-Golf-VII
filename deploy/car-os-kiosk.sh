#!/bin/sh
# Chromium u kiosk rezimu preko celog ekrana. Kamera se odobrava automatski
# (--use-fake-ui-for-media-stream), zvuk radi bez dodira, bez prevoda i obavestenja.
until curl -s -o /dev/null http://127.0.0.1:4173; do sleep 1; done
BROWSER=$(command -v chromium || command -v chromium-browser)
exec "$BROWSER" \
  --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
  --disable-translate --disable-features=Translate,TouchpadOverscrollHistoryNavigation \
  --overscroll-history-navigation=0 --check-for-update-interval=31536000 \
  --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required \
  --ignore-gpu-blocklist --enable-gpu-rasterization \
  --password-store=basic --user-data-dir="$HOME/.config/car-os-chromium" \
  http://127.0.0.1:4173/
