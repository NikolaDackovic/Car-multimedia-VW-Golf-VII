#!/bin/bash
# Car OS — instalacija na Linux racunar u autu (Raspberry Pi OS Bookworm 64-bit,
# Debian 12 ili Ubuntu 22.04+). Pokrece se iz foldera koji sadrzi dist/, bridge/ i deploy/:
#   sudo ./deploy/install.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Pokreni sa sudo"; exit 1; fi
SRC="$(cd "$(dirname "$0")/.." && pwd)"
USER_NAME="${SUDO_USER:-$(logname)}"
USER_HOME="$(getent passwd "$USER_NAME" | cut -d: -f6)"
[ -d "$SRC/dist" ] || { echo "Nema dist/ — prvo 'npm run build' na racunaru i kopiraj dist/"; exit 1; }

echo "== Paketi"
apt-get update
apt-get install -y python3 python3-venv curl can-utils
apt-get install -y chromium || apt-get install -y chromium-browser

echo "== Fajlovi u /opt/car-os"
mkdir -p /opt/car-os
rm -rf /opt/car-os/dist /opt/car-os/bridge
cp -r "$SRC/dist" "$SRC/bridge" /opt/car-os/
install -m 755 "$SRC/deploy/car-os-kiosk.sh" /opt/car-os/car-os-kiosk.sh
python3 -m venv /opt/car-os/venv
/opt/car-os/venv/bin/pip install --upgrade pip
/opt/car-os/venv/bin/pip install -r /opt/car-os/bridge/requirements.txt
chown -R "$USER_NAME":"$USER_NAME" /opt/car-os

echo "== Servisi"
install -m 644 "$SRC/deploy/car-os-web.service" /etc/systemd/system/car-os-web.service
sed "s/carOS_USER/$USER_NAME/" "$SRC/deploy/car-bridge.service" > /etc/systemd/system/car-bridge.service
if [ ! -f /etc/default/car-bridge ]; then
  cat > /etc/default/car-bridge <<CONF
# Argumenti za car-bridge. Primer za auto (CAN + GPIO ulazi):
# BRIDGE_ARGS="--can can0 --dbc /opt/car-os/bridge/vw_mqb_2010.dbc --reverse-gpio 17 --park-key-gpio 27 --ignition-gpio 22"
BRIDGE_ARGS="--sim"
CONF
fi

echo "== CAN (can0, 500 kbit/s, samo citanje)"
install -m 644 "$SRC/deploy/80-can.network" /etc/systemd/network/80-can.network
systemctl enable systemd-networkd

echo "== Kiosk (automatsko pokretanje posle prijave)"
mkdir -p "$USER_HOME/.config/autostart"
cat > "$USER_HOME/.config/autostart/car-os.desktop" <<DESK
[Desktop Entry]
Type=Application
Name=Car OS
Exec=/opt/car-os/car-os-kiosk.sh
X-GNOME-Autostart-enabled=true
DESK
# Raspberry Pi OS Bookworm (labwc / Wayland)
if command -v labwc >/dev/null 2>&1; then
  mkdir -p "$USER_HOME/.config/labwc"
  grep -q car-os-kiosk "$USER_HOME/.config/labwc/autostart" 2>/dev/null || \
    echo "/opt/car-os/car-os-kiosk.sh &" >> "$USER_HOME/.config/labwc/autostart"
fi
chown -R "$USER_NAME":"$USER_NAME" "$USER_HOME/.config"

systemctl daemon-reload
systemctl enable --now car-os-web.service car-bridge.service

echo
echo "Gotovo. Car OS: http://127.0.0.1:4173  (pokrece se sam posle prijave)"
echo "Podesi /etc/default/car-bridge za auto, pa: sudo systemctl restart car-bridge"
echo "Na Raspberry Pi-ju ukljuci automatsku prijavu: sudo raspi-config -> System -> Boot/Auto login -> Desktop Autologin"
