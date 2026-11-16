# Hardver za Car OS u Golfu VII (2014, 1.6 TDI)

## Može li na postojeću Desay RCD520 (5GG035869)?

**Ne.** Desay jedinica ima zatvoren, potpisan softver proizvođača i nema način da se na njoj pokrene
naša aplikacija. To nije Android ni otvoren Linux. Postoje dva realna puta:

| Put | Kako | Prednosti | Mane |
| --- | --- | --- | --- |
| **A. Sopstveni računar (preporuka)** | mini računar + ekran osetljiv na dodir u okviru za Golf 7, umesto Desay-a | radi sve što smo napravili: 3D, kamera, ParkPilot, CAN, potpuna kontrola | treba pojačalo za zvučnike i malo ugradnje |
| B. Android jedinica za Golf 7 | Car OS se otvara preko celog ekrana u Chrome-u / WebView-u | najlakša ugradnja (gotov okvir, kablovi, CAN dekoder) | bridge nije gotov za Android, a CAN dekoder ima svoj zatvoren protokol |

U nastavku je put **A**.

## Spisak delova (put A)

| Deo | Preporuka | Zašto |
| --- | --- | --- |
| Računar | **Intel N100 mini PC** (8 GB RAM, 12 V napajanje) ili **Raspberry Pi 5 (8 GB)** + aktivni hladnjak | N100 ima jaču grafiku i 3D radi glatko; Pi 5 je manji i troši manje |
| Ekran | 9" ili 10,1" IPS, **1280×720 ili 1280×800**, kapacitivni dodir (HDMI + USB) | aplikacija je pravljena za 1280×720 i skalira se sama |
| Okvir | okvir (fascia) za Golf 7 za 9"/10" jedinice | da ekran stane u kontrolnu tablu kao fabrički |
| Kablovi za auto | **Quadlock kabl za Golf 7 (MQB)** sa izvodima za napajanje, zvučnike i CAN | bez sečenja fabričkih kablova |
| CAN | **USB-CAN adapter** (CANable 2.0 ili PEAK PCAN-USB) ili CAN HAT za Pi | čitanje podataka iz auta; radi u režimu samo za čitanje |
| Zvuk | USB zvučna kartica (DAC) + **pojačalo 4×50 W** (kompaktno, klasa D) | Desay je imao ugrađeno pojačalo; računar nema |
| Napajanje | 12 V → 5 V/5 A (Pi) ili 12 V → 12/19 V (mini PC), sa **kašnjenjem gašenja** (ignition controller) | računar se gasi bezbedno par minuta posle gašenja kontakta |
| Ulazi | 2–3 **optokaplera** (PC817 modul, 12 V) | rikverc, kontakt (+15) i taster P ka GPIO pinovima |
| Kamera (po želji) | kamera za rikverc (npr. u znaku na petim vratima) + **USB video grabber (UVC)** | slika preko celog ekrana pri rikvercu |
| Mikrofon (po želji) | USB mikrofon | za razgovore preko telefona, kada se doda pravi Bluetooth |
| GPS (po želji) | USB GPS (u-blox 7/8) | za navigaciju kada se doda prava mapa |

> Ako uzimaš N100 mini PC, GPIO pinova nema. Ulaze (rikverc, kontakt, P) tada daje mali USB modul
> (npr. Raspberry Pi Pico kao USB ulaz) ili se uzimaju sa CAN-a.

## Povezivanje

```
Quadlock (Golf 7)
 ├─ +30 (stalni 12 V) i masa ─────► napajanje sa kašnjenjem gašenja ─► računar
 ├─ +15 (kontakt) ────────────────► optokapler ─► GPIO 22   (--ignition-gpio 22)
 ├─ CAN-H / CAN-L (infotainment) ─► USB-CAN adapter ─► can0  (--can can0)
 └─ zvučnici ◄──────────────────── pojačalo 4×50 W ◄── USB zvučna kartica

Svetlo za vožnju unazad (+12 V) ──► optokapler ─► GPIO 17   (--reverse-gpio 17)
                                └─► napajanje kamere
Taster P (ili slobodan taster) ───► GPIO 27 i masa          (--park-key-gpio 27)
Kamera ──► USB video grabber ──► USB računara
Ekran  ──► HDMI + USB (dodir)
```

Raspored pinova na quadlock-u proveri po šemi za svoj model, ili koristi gotov adapter kabl sa
obeleženim izvodima. Ništa se ne vezuje direktno na 12 V GPIO, uvek preko optokaplera.

## Šta radi odmah, a šta posle podešavanja

| Funkcija | Stanje |
| --- | --- |
| Ceo interfejs, 3D vozilo, podešavanja, servisna knjiga | radi odmah |
| Muzika sa USB-a / iz foldera | radi odmah |
| Rikverc → ParkPilot / kamera | radi čim se poveže optokapler i kamera |
| Kontakt → mirovanje / buđenje ekrana | radi čim se poveže optokapler |
| Brzina, vrata, svetlo za rikverc sa CAN-a | treba proveriti imena signala (`candump`, opendbc DBC) |
| Tasteri na volanu, rastojanja fabričkih parking senzora | CAN poruke treba pronaći snimanjem, pa ih upisati u `car_bridge.py` |
| Gorivo, temperature, greške | isto: pronaći na CAN-u ili čitati dijagnostikom |
| Komande ka autu (SET gume, Start-Stop, podešavanja vozila) | bridge ih prima; slanje u auto zahteva dijagnostičke poruke i proveru na autu |
| Radio tjuner (FM/DAB) | u aplikaciji je simulacija; za pravi prijem treba USB tjuner i dodatni rad |
| Telefon (pozivi, kontakti) | u aplikaciji je simulacija; za prave pozive treba Bluetooth hands-free i dodatni rad |
| Navigacija | demo mapa; za pravu treba offline mapa i GPS |

## Redosled koji preporučujem

1. Na stolu: računar + ekran, instalacija (`deploy/README.md`), bridge u `--sim` režimu.
2. U autu, samo napajanje i ekran: sistem se pali i gasi sa kontaktom.
3. Rikverc i kamera: optokapler + USB grabber, pa test u rikvercu.
4. CAN u režimu samo za čitanje: `candump can0`, provera signala, pa podaci vozila u Car OS-u.
5. Zvuk: pojačalo i zvučnici.
6. Tasteri na volanu i parking senzori: snimanje CAN-a i upis poruka u `car_bridge.py`.
