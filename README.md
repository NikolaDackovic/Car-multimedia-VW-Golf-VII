# Car OS

Infotainment za moj Golf VII, napravljen po uzoru na fabrički VW MIB2 (Composition Media /
Discover Media): React + TypeScript interfejs koji se razvija na Windowsu, a kasnije pokreće na
Linux mini računaru sa ekranom osetljivim na dodir.

Interfejs je fiksiran na **1280 × 720 landscape** i skalira se da stane u prozor, pa razvoj na
računaru verno prikazuje kako će izgledati na uređaju.

## Pokretanje

```bash
npm install
npm run dev     # razvojni server (http://localhost:5173)
npm run build   # provera tipova + produkcijski build
npm run lint
```

## Izgled

Fabrički MIB2 ton: čisto crna podloga, neutralne sive linije, oštri okviri, beli tekst i jedna
akcentna boja (kod VW-a žuta, ovde plava — menja se u Podešavanja → Ekran, uključujući i
„Fabrička žuta"). Sve vizuelne odluke su u [src/styles/tokens.css](src/styles/tokens.css);
komponente ne pišu boje direktno. Prikaz ima fabričke režime **Dan / Noć / Automatski**.

Glavni meni prati fabrički MENU Golfa 7.5: dva reda po četiri pločice sa metalnim SVG
ikonicama ([MenuIcon.tsx](src/components/oem/MenuIcon.tsx)), druga strana prevlačenjem.

## Fizički tasteri

MENU, HOME, napajanje i glasnoća su tasteri na samoj multimediji, pa se ne crtaju na ekranu.
Stižu kao događaji tastature (HID) i mapirani su u [MainShell.tsx](src/components/layout/MainShell.tsx):

| Taster | Tastatura / HID |
| --- | --- |
| MENU | `ContextMenu` ili `F1` |
| HOME | `Home` ili `F2` |
| Glasnoća + / − | `AudioVolumeUp` / `AudioVolumeDown` (ili `F8` / `F7`) |
| Utišaj | `AudioVolumeMute` ili `F6` |
| Napajanje | `PowerOff` ili `F12` |
| Taster P (ParkPilot) | `F3` (ili poruka od bridge-a) |
| Rikverc, za probu bez auta | `F4` (u autu stiže od bridge-a) |

Na ekranu svaki meni ima dugme **Nazad** i **Početna** u naslovnoj traci.

## Funkcije (po fabričkom uputstvu)

- **Početna** — navigacija, aktivni audio izvor (radio/medija) i favoriti telefona.
- **Radio** — FM/AM/DAB, 15 memorija u grupama po 5 (držanje = upis), lista stanica sa
  sortiranjem, ručno traženje po skali, Scan, RDS/radiotekst, TP, AF, regionalni RDS, DAB opcije.
- **Medija** — izvori (USB 1 radi; USB 2, SD, CD, AUX, BT audio su prikazani kao nepriključeni),
  lista naslova po folderima, režim ponavljanja/nasumično, premotavanje dugim pritiskom.
- **Telefon** — favoriti, tastatura, kontakti (tastatura na ekranu), liste poziva, SMS,
  Bluetooth i korisnički profil, melodija zvona.
- **Instrumenti** — obrtomer i brzinomer, a u sredini moj Golf na putu koji teče stvarnom brzinom
  vozila (sa CAN-a preko bridge-a; bez veze demo vožnja).
- **Parkiranje** — jedna funkcija za svaku opremu (Podešavanja vozila → Parkiranje): *parking
  senzori* → fabrički OPS prikaz (auto odozgo, žute/crvene zone, zvučni signal sa jačinom i tonom
  iz podešavanja, utišavanje muzike), *kamera* → slika preko celog ekrana sa pomoćnim linijama,
  *kamera i senzori* → kamera + mali OPS. Otvara se rikvercom ili tasterom P, zatvara se
  dugmetom, tasterom P ili iznad 15 km/h.
- **Vozilo** — podaci o vožnji (Od starta / Od točenja / Dugoročno), status vozila u 3D preko
  celog panela sa tri prikaza — Pregled, Profil (gorivo, domet, kilometraža) i Vožnja (put teče,
  potrošnja); kamera prelazi lukom oko vozila. Sve što nije u redu je žuta tačka na vozilu, dodir kaže
  šta je problem; brze kartice Servis i Pritisak u gumama, Start-Stop, plavo ⓘ sa svim porukama i
  podacima), potrošači komfora, kontrola pritiska u gumama
  odozgo sa brojevima pored točkova (ispod 2,0 bar žuto, inače zeleno), provera pritiska i SET,
  servis (sa servisnim položajem brisača) i servisna
  knjiga, kompletna podešavanja vozila (ESC, gume, sistemi za pomoć, ParkPilot, svetla, ogledala
  i brisači, otvaranje/zatvaranje, sedišta, MFD, fabrička podešavanja po grupama).
- **Sistemi za pomoć**, **Zvuk** (glasnoće, GALA, ton, balans/fader), **App-Connect**,
  **Podešavanja** (ekran, vreme i datum sa ručnim podešavanjem, jezik, tastatura, jedinice,
  bezbedno uklanjanje, fabrička podešavanja, informacije o sistemu), **Navigacija** (demo),
  **Slike** (prikaz i prezentacija), **Klima** (simulacija).
- Tastatura na ekranu (QWERTZ/ABC, srpska slova), prikaz glasnoće, isključivanje ekrana posle
  10 s, senzor približavanja (pomoćne kontrole se povlače kad se ekran ne dira), ton potvrde.

## 3D model

[Car3D.tsx](src/features/vehicle/Car3D.tsx) prikazuje `public/vehicle/volkswagen_golf_r.glb`
(three.js / React Three Fiber) u stilu fabričkih prezentacija: auto stoji na putu, put se pojavi i
„teče" ka vozilu, točkovi se okreću pa uspore, kamera klizi do kadra. Kadrovi su fiksni (3/4 spreda,
bočno, pozadi, odozgo za kontrolu pritiska u gumama) i vozilo je uvek tačno centrirano; dodirom se
ne okreće. Model se učitava u pozadini posle pokretanja sistema. Karoserija se boji u boju mog auta,
sve radi bez interneta, a fotografija se koristi samo ako uređaj nema WebGL.

> Model: „2019 Volkswagen Golf R" — Ddiaz Design (sketchfab.com/ddiaz-design),
> licenca **CC BY-NC-SA 4.0** (samo nekomercijalno, uz navođenje autora). Navedeno je i u
> Podešavanja → Autorska prava.

## Arhitektura

```
src/
├── app/           providers, podešavanja, navigacija (ekran + podmeni), skoljka, glasnoća
├── components/
│   ├── layout/    MainShell, TitleBar, Viewport (skaliranje 1280×720)
│   ├── oem/       fabričke kontrole: dugmad, liste, iskačući prozori, tastatura, metalne ikonice
│   └── system/    stanja napajanja, prikaz glasnoće, obaveštenja
├── features/      home, menu, radio, media, phone, vehicle, assist, sound, settings, ...
├── services/      audio, radio, phone, vehicle, maintenance, prefs, pictures, storage, platform
├── hooks/         useClock, useAudio, useRadio, usePrefs, useUnits, useLongPress, ...
└── i18n/          sr (latinica) i en — isti oblik, TypeScript proverava
```

Pravilo: **komponente prikazuju, features sadrže funkcionalnost, services razgovaraju sa
platformom.** Ekran nikada ne zove hardver direktno.

## Šta je stvarno, a šta simulirano

| Stvarno radi | Simulirano |
| --- | --- |
| Reprodukcija lokalnih audio fajlova, glasnoća | Radio tjuner (nema prijema signala) |
| Kamera za rikverc (USB video), zvuk ParkPilot-a | Podaci vozila i senzora dok bridge nije povezan |
| Slike sa USB-a / foldera | Klima i potrošnja dok nisu mapirani CAN signali |
| Servisna knjiga | Telefon/Bluetooth (pozivi se samo beleže) |
| Čuvanje svih podešavanja, jedinice, vreme | Navigacija, App-Connect, stanja napajanja |

## Ugradnja u auto

Instalacija na Linux računar jednom komandom: [deploy/README.md](deploy/README.md).
Šta treba kupiti i kako se povezuje: [deploy/HARDWARE.md](deploy/HARDWARE.md).

## Povezivanje sa autom

Car OS ne dira hardver direktno. Program [bridge/car_bridge.py](bridge/car_bridge.py) na istom
Linux računaru čita CAN, ulaz za rikverc i taster P i šalje podatke preko WebSocket-a
(`ws://127.0.0.1:8765`, menja se u Podešavanja vozila → Oprema i veza sa vozilom). Kad je bridge
povezan, simulacija se gasi i oznaka **SIMULIRANO** nestaje. Kamera za rikverc je USB video uređaj
i otvara se direktno u Chromium-u. Ožičenje, pokretanje i protokol su opisani u
[bridge/README.md](bridge/README.md).

Komande ka autu (SET za gume, Start-Stop, podešavanja vozila) se šalju bridge-u, ali ih on za sada
samo beleži. Da bi stvarno nešto menjale u autu, potrebne su dijagnostičke poruke koje treba
proveriti na samom autu.

Za razvoj: `http://localhost:5173/?screen=vehicle&path=status&doors=driver,trunk&nointro&lang=en`
otvara ekran i podmeni direktno, bez uvodne animacije (samo `npm run dev`). `&hw=both&park=sensors`
bira opremu i otvara prikaz parkiranja.

> Ovo je hobi projekat, ne bezbednosno sertifikovan automobilski sistem.
