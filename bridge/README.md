# car-bridge: veza Car OS-a sa autom

Car OS je interfejs i ne dira direktno hardver auta. Sve što dolazi iz auta prolazi kroz mali
program `car_bridge.py` koji radi na istom Linux računaru i sa Car OS-om razgovara preko
WebSocket-a (`ws://127.0.0.1:8765`). Dok bridge ne radi, Car OS prikazuje simulirane podatke sa
oznakom **SIMULIRANO**. Kad se poveže, oznaka nestaje, a simulacija se gasi.

```
 Golf VII ──CAN──► USB-CAN adapter ─┐
 svetlo za rikverc ──► optokapler ──┼─► car_bridge.py ──WebSocket──► Car OS (Chromium kiosk)
 taster P ───────────────────────────┘
 kamera za rikverc ──► USB video grabber (UVC) ─────────────────────► Car OS (getUserMedia)
```

## Šta treba od hardvera

| Funkcija | Hardver | Napomena |
| --- | --- | --- |
| Rikverc (otvara parking prikaz) | +12 V sa svetla za vožnju unazad → **optokapler** (npr. PC817 + otpornik ~1,5 kΩ) → GPIO | Najpouzdaniji način, ne zavisi od CAN-a |
| Taster P | taster između GPIO pina i mase | ili poruka sa CAN-a |
| Kamera za vožnju unazad | analogna kamera → **USB video grabber** (UVC), ili USB kamera | napajanje kamere sa svetla za rikverc, pa radi samo u rikvercu |
| Podaci vozila (brzina, vrata...) | **USB-CAN adapter** (SocketCAN, npr. CANable ili PEAK) ili CAN HAT | samo čitanje, adapter u *listen-only* režimu |
| Parking senzori | fabrički ParkPilot (CAN) ili naknadni komplet sa izlazom | CAN poruke senzora treba pronaći snimanjem |

> **Bezbednost:** na CAN prvo povezati adapter u režimu samo za čitanje
> (`ip link set can0 type can bitrate 500000 listen-only on`). Ništa se ne šalje u auto.

## Pokretanje

```bash
pip install websockets python-can cantools gpiozero

# Bez auta, samo za probu (rikverc se pali na 20 s svakog minuta):
python3 car_bridge.py --sim

# U autu:
sudo ip link set can0 up type can bitrate 500000 listen-only on
python3 car_bridge.py --can can0 --dbc vw_mqb_2010.dbc --reverse-gpio 17 --park-key-gpio 27
```

DBC fajl za VW MQB (Golf VII) se nalazi u projektu **opendbc** (`vw_mqb_2010.dbc`). Imena poruka
i signala u `car_bridge.py` (`VEHICLE_SIGNALS`) su iz tog fajla. Na svom autu ih obavezno proveri
sa `candump can0` i `cantools monitor`: na konektoru radija je infotainment CAN i na njemu nisu
sve poruke. Neke se vide samo na gateway-u (J533).

Da bi se bridge pokretao sa sistemom, napravi systemd servis (`/etc/systemd/system/car-bridge.service`)
sa `ExecStart=/usr/bin/python3 /opt/car-os/bridge/car_bridge.py --can can0 ...` i `Restart=always`.

## Kamera u Chromium-u

Kamera se otvara kao obična web kamera. Da Chromium u kiosk režimu ne bi pitao za dozvolu:

```bash
chromium --kiosk --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required http://localhost:4173
```

Ulaz kamere i ogledalska slika biraju se u **Vozilo → Podešavanja vozila → Parkiranje i
manevrisanje**. Tu se bira i oprema: *Parking senzori*, *Kamera*, ili *Kamera i parking senzori*.

## Protokol (JSON preko WebSocket-a)

Bridge → Car OS:

```json
{ "type": "hello",   "name": "car-bridge", "version": 1 }
{ "type": "vehicle", "data": { "speedKmh": 12, "coolantC": 90, "doors": { "driver": true } } }
{ "type": "park",    "data": { "reverse": true, "front": [null, 80, 95, null], "rear": [40, 25, 30, 60], "fault": false } }
{ "type": "key",     "key": "park" }
```

- `vehicle.data` je deo stanja vozila (`VehicleState` u `src/services/vehicle/index.ts`). Šalje se
  samo ono što se promenilo: `speedKmh`, `rpm`, `coolantC`, `oilC`, `outsideC`, `fuelPercent`,
  `fuelLiters`, `rangeKm`, `odometerKm`, `batteryV`, `doors`, `windowsClosed`, `parkingBrake`,
  `washerFluidOk`, `oilLevelOk`, `gear` (stepen prenosa: 0 = ler, -1 = rikverc), `ignition` (kontakt), `tyreBar` (`[pl, pd, zl, zd]` u barima), `faults`...
- `faults`: lista poruka, npr. `[{ "id": "b1", "level": "warn", "code": "bulb", "bulb": "tailRight", "area": "rear" }]`.
  Sijalice: `headLeft`, `headRight`, `indicatorFrontLeft`, `indicatorFrontRight`, `fogLeft`, `fogRight`,
  `mirrorLeft`, `mirrorRight`, `tailLeft`, `tailRight`, `rearLowLeft`, `rearLowRight`, `brakeThird`, `plate`.
  Status vozila sam pokaže mesto kvara i okrene kameru na tu stranu vozila.
- `park.front` / `park.rear`: rastojanje u cm za 4 sektora (levi ugao, levo, desno, desni ugao).
  `null` znači da prepreke nema.

Car OS → bridge:

```json
{ "type": "hello",    "name": "car-os", "version": 1 }
{ "type": "settings", "data": { "light.comingHome": 30, "park.rearVolume": 5 } }
{ "type": "setting",  "key": "light.comingHome", "value": 30 }
{ "type": "command",  "name": "tpmsSet" }
{ "type": "command",  "name": "tpmsCheck" }
{ "type": "command",  "name": "startStop", "value": false }
```

Komande i podešavanja vozila bridge za sada samo beleži. Da bi stvarno menjali nešto u autu,
potrebne su dijagnostičke (UDS) poruke za svaki modul. To se dodaje tek kada se svaka komanda
proveri na autu.
