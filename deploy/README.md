# Instalacija Car OS-a u auto

Car OS radi na malom Linux računaru iza ekrana. Aplikacija je obična web stranica: Chromium je
prikazuje preko celog ekrana, a `car-bridge` donosi podatke iz auta. Šta treba kupiti i kako se
povezuje opisano je u [HARDWARE.md](HARDWARE.md).

## 1. Na računaru (Windows): napravi paket

```bash
npm install
npm run build          # pravi folder dist/
```

Na računar u autu (USB stik ili `scp`) kopiraj ova tri foldera: `dist/`, `bridge/` i `deploy/`.

## 2. Na računaru u autu (Linux): instalacija jednom komandom

Podržani sistemi: Raspberry Pi OS Bookworm 64-bit (Desktop), Debian 12 ili Ubuntu 22.04+.

```bash
cd car-os          # folder sa dist/, bridge/, deploy/
sudo ./deploy/install.sh
```

Skripta:

- instalira Chromium, Python i `can-utils`;
- kopira aplikaciju u `/opt/car-os` i za bridge pravi Python okruženje;
- pravi servise `car-os-web` (aplikacija na `http://127.0.0.1:4173`) i `car-bridge`;
- podešava CAN (`can0`, 500 kbit/s, **samo čitanje**);
- podešava Chromium da se posle prijave otvori sam, u kiosk režimu preko celog ekrana, sa
  automatskom dozvolom za kameru.

Na Raspberry Pi-ju uključi automatsku prijavu: `sudo raspi-config` → *System Options* →
*Boot / Auto Login* → *Desktop Autologin*. Posle toga uradi restart.

Za prvo paljenje bridge radi u simulaciji (`--sim`), pa se vidi da li veza radi: oznaka
**SIMULIRANO** nestaje, a na 20 s svakog minuta se uključi rikverc.

## 3. Povezivanje sa autom

U `/etc/default/car-bridge` upiši šta je povezano, na primer:

```bash
BRIDGE_ARGS="--can can0 --dbc /opt/car-os/bridge/vw_mqb_2010.dbc --reverse-gpio 17 --park-key-gpio 27 --ignition-gpio 22"
```

Zatim uradi `sudo systemctl restart car-bridge`.

- DBC fajl `vw_mqb_2010.dbc` preuzmi iz projekta **opendbc** (GitHub) u `/opt/car-os/bridge/`.
- Pre toga proveri da CAN stiže: `candump can0` treba da ispisuje poruke kada je kontakt uključen.
- U Car OS-u: **Vozilo → Podešavanja vozila → Oprema i veza sa vozilom** pokazuje stanje veze,
  a **Parkiranje i manevrisanje** služi za izbor opreme (senzori / kamera / oboje) i ulaza kamere.

## 4. Provera

| Šta | Kako |
| --- | --- |
| Aplikacija radi | `systemctl status car-os-web` |
| Bridge radi | `journalctl -u car-bridge -f` (vidi se „Car OS povezan") |
| CAN stiže | `candump can0` |
| Rikverc | ubaci u rikverc: otvara se ParkPilot ili kamera |
| Kamera | `v4l2-ctl --list-devices` pokazuje USB video uređaj |

## Ažuriranje

Na računaru uradi `npm run build`, kopiraj novi `dist/` i ponovo pokreni `sudo ./deploy/install.sh`.
Podešavanja ostaju sačuvana u Chromium profilu, a `/etc/default/car-bridge` se ne menja.
