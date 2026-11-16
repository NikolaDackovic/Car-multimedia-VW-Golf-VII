#!/usr/bin/env python3
"""
car-bridge — veza izmedju Golfa VII i Car OS-a.

Radi na Linux racunaru u autu. Cita:
  * CAN magistralu (USB-CAN adapter ili CAN HAT, SocketCAN `can0`) i dekodira
    poruke pomocu DBC fajla (npr. opendbc `vw_mqb_2010.dbc`)
  * digitalne ulaze (GPIO): rikverc (+12 V sa svetla za voznju unazad, preko
    optokaplera) i taster P
i salje podatke Car OS-u preko WebSocket-a (ws://127.0.0.1:8765) kao JSON.

Protokol je opisan u bridge/README.md i u src/services/bridge/index.ts.

Pokretanje:
  python3 car_bridge.py --sim                       # bez auta: simulacija
  python3 car_bridge.py --can can0 --dbc vw_mqb_2010.dbc --reverse-gpio 17

Zavisnosti: pip install websockets   (+ python-can cantools gpiozero po potrebi)
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import math
import random
import time
from typing import Any, Callable

import websockets

log = logging.getLogger("car-bridge")
VERSION = 1

# --------------------------------------------------------------------------
# Mapiranje CAN signala na polja Car OS-a.
#
# Imena poruka i signala su iz opendbc `vw_mqb_2010.dbc` (VW MQB platforma,
# kojoj pripada Golf VII). OBAVEZNO proveriti na svom autu (`candump can0`,
# `cantools monitor`): na konektoru radija je infotainment CAN i na njemu nije
# svaka poruka — neke su dostupne samo na gateway-u (J533).
# Format: (poruka, signal, polje u Car OS-u, konverzija)
# --------------------------------------------------------------------------
Conv = Callable[[Any], Any]

VEHICLE_SIGNALS: list[tuple[str, str, str, Conv]] = [
    ("ESP_21", "ESP_v_Signal", "speedKmh", lambda v: round(float(v))),
    ("Gateway_72", "ZV_FT_offen", "doors.driver", bool),
    ("Gateway_72", "ZV_BT_offen", "doors.passenger", bool),
    ("Gateway_72", "ZV_HD_offen", "doors.trunk", bool),
]

# Rikverc sa CAN-a (rucni menjac: prekidac svetla za voznju unazad).
# Ako se koristi GPIO ulaz (--reverse-gpio), ovo se ne koristi.
REVERSE_SIGNAL: tuple[str, str] | None = ("Gateway_72", "BCM1_Rueckfahrlicht_Schalter")


# Tasteri sa volana (MFL). U opendbc nisu opisani za infotainment CAN — pronalaze se
# snimanjem dok se pritiska taster. Format: (poruka, signal, vrednost, taster u Car OS-u)
# Tasteri u Car OS-u: volUp, volDown, mute, next, prev, menu, home, park
KEY_SIGNALS: list[tuple[str, str, int, str]] = [
    # ("MFL_Tasten", "Taster_Lautstaerke_Plus", 1, "volUp"),   # primer — proveriti
]


def decode_park(msg_name: str, signals: dict[str, Any]) -> dict[str, Any] | None:
    """
    Rastojanja parking senzora (cm po sektoru: levi ugao, levo, desno, desni ugao).

    Fabricki ParkPilot salje rastojanja na CAN-u, ali te poruke nisu u javnim
    DBC fajlovima — pronalaze se snimanjem (`candump -l can0`) dok se prilazi
    prepreci. Kada se pronadju, ovde se vrati npr.:
        {"rear": [None, 80, 75, None]}
    Za naknadne senzore sa serijskim izlazom ovde se moze citati serijski port.
    """
    return None


# --------------------------------------------------------------------------


class Bridge:
    def __init__(self) -> None:
        self.clients: set[Any] = set()
        self.vehicle: dict[str, Any] = {}
        self.park: dict[str, Any] = {"reverse": False, "front": [None] * 4, "rear": [None] * 4}

    async def broadcast(self, msg: dict[str, Any]) -> None:
        if not self.clients:
            return
        data = json.dumps(msg)
        await asyncio.gather(*(c.send(data) for c in list(self.clients)), return_exceptions=True)

    async def send_vehicle(self, patch: dict[str, Any]) -> None:
        # "doors.driver" -> {"doors": {"driver": ...}}
        nested: dict[str, Any] = {}
        for key, value in patch.items():
            if "." in key:
                group, field = key.split(".", 1)
                nested.setdefault(group, {})[field] = value
            else:
                nested[key] = value
        self.vehicle.update(nested)
        await self.broadcast({"type": "vehicle", "data": nested})

    async def send_park(self, patch: dict[str, Any]) -> None:
        self.park.update(patch)
        await self.broadcast({"type": "park", "data": patch})

    async def press_key(self, key: str) -> None:
        await self.broadcast({"type": "key", "key": key})

    async def press_park_key(self) -> None:
        await self.press_key("park")

    async def handler(self, ws: Any) -> None:
        self.clients.add(ws)
        log.info("Car OS povezan (%d)", len(self.clients))
        try:
            await ws.send(json.dumps({"type": "hello", "name": "car-bridge", "version": VERSION}))
            if self.vehicle:
                await ws.send(json.dumps({"type": "vehicle", "data": self.vehicle}))
            await ws.send(json.dumps({"type": "park", "data": self.park}))
            async for raw in ws:
                try:
                    self.on_message(json.loads(raw))
                except (ValueError, TypeError):
                    log.warning("Neispravna poruka: %r", raw)
        finally:
            self.clients.discard(ws)
            log.info("Car OS odvezan (%d)", len(self.clients))

    def on_message(self, msg: dict[str, Any]) -> None:
        kind = msg.get("type")
        if kind == "command":
            # tpmsSet / tpmsCheck / startStop zahtevaju dijagnosticke komande
            # (UDS) ka odgovarajucem modulu — namerno nisu implementirane.
            log.info("Komanda iz Car OS-a: %s %s", msg.get("name"), msg.get("value", ""))
        elif kind == "setting":
            log.info("Podesavanje vozila: %s = %r", msg.get("key"), msg.get("value"))
        elif kind == "settings":
            log.info("Primljeno %d podesavanja vozila", len(msg.get("data", {})))


# ------------------------------ izvori podataka ------------------------------


async def run_can(bridge: Bridge, channel: str, dbc_path: str) -> None:
    import can  # python-can
    import cantools

    db = cantools.database.load_file(dbc_path)
    wanted = {m for m, *_ in VEHICLE_SIGNALS}
    if REVERSE_SIGNAL:
        wanted.add(REVERSE_SIGNAL[0])
    ids = {db.get_message_by_name(n).frame_id: n for n in wanted if _has_message(db, n)}
    bus = can.interface.Bus(channel=channel, interface="socketcan")
    reader = can.AsyncBufferedReader()
    can.Notifier(bus, [reader], loop=asyncio.get_running_loop())
    log.info("CAN %s: pratim %s", channel, ", ".join(sorted(ids.values())))

    last: dict[str, Any] = {}
    while True:
        frame = await reader.get_message()
        try:
            msg = db.get_message_by_frame_id(frame.arbitration_id)
        except KeyError:
            continue
        try:
            signals = msg.decode(frame.data, decode_choices=False)
        except Exception:  # noqa: BLE001 — nepotpun okvir, preskace se
            continue

        patch: dict[str, Any] = {}
        for m, sig, field, conv in VEHICLE_SIGNALS:
            if m == msg.name and sig in signals:
                value = conv(signals[sig])
                if last.get(field) != value:
                    last[field] = value
                    patch[field] = value
        if patch:
            await bridge.send_vehicle(patch)

        if REVERSE_SIGNAL and msg.name == REVERSE_SIGNAL[0] and REVERSE_SIGNAL[1] in signals:
            reverse = bool(signals[REVERSE_SIGNAL[1]])
            if reverse != bridge.park["reverse"]:
                await bridge.send_park({"reverse": reverse})

        for m, sig, value, key in KEY_SIGNALS:
            if m == msg.name and signals.get(sig) == value and last.get("key:" + key) != value:
                await bridge.press_key(key)
            if m == msg.name and sig in signals:
                last["key:" + key] = signals[sig]

        park = decode_park(msg.name, signals)
        if park:
            await bridge.send_park(park)


def _has_message(db: Any, name: str) -> bool:
    try:
        db.get_message_by_name(name)
        return True
    except KeyError:
        log.warning("Poruka %s nije u DBC fajlu", name)
        return False


async def run_gpio(bridge: Bridge, reverse_pin: int | None, key_pin: int | None, ignition_pin: int | None = None) -> None:
    from gpiozero import Button

    loop = asyncio.get_running_loop()

    def later(coro_fn: Callable[[], Any]) -> Callable[[], None]:
        return lambda: asyncio.run_coroutine_threadsafe(coro_fn(), loop)

    if reverse_pin is not None:
        # Optokapler vuce ulaz na masu dok je rikverc ubacen
        rev = Button(reverse_pin, pull_up=True, bounce_time=0.05)
        rev.when_pressed = later(lambda: bridge.send_park({"reverse": True}))
        rev.when_released = later(lambda: bridge.send_park({"reverse": False}))
        log.info("Rikverc na GPIO%d", reverse_pin)
    if ignition_pin is not None:
        # Kontakt (+15) preko optokaplera: bez kontakta Car OS prelazi u mirovanje
        ign = Button(ignition_pin, pull_up=True, bounce_time=0.2)
        ign.when_pressed = later(lambda: bridge.send_vehicle({"ignition": True}))
        ign.when_released = later(lambda: bridge.send_vehicle({"ignition": False}))
        log.info("Kontakt na GPIO%d", ignition_pin)
    if key_pin is not None:
        key = Button(key_pin, pull_up=True, bounce_time=0.05)
        key.when_pressed = later(bridge.press_park_key)
        log.info("Taster P na GPIO%d", key_pin)
    await asyncio.Event().wait()


async def run_sim(bridge: Bridge) -> None:
    """Simulacija: rikverc na 20 s svakog minuta, prepreka pozadi se priblizava."""
    log.info("Simulacija (bez vozila)")
    t0 = time.monotonic()
    while True:
        t = time.monotonic() - t0
        reverse = (t % 60) < 20
        if reverse != bridge.park["reverse"]:
            await bridge.send_park({"reverse": reverse})
        if reverse:
            d = max(20, 160 - (t % 60) * 7)
            await bridge.send_park({"rear": [None, round(d), round(d + 12), None], "front": [None] * 4})
        await bridge.send_vehicle(
            {
                "speedKmh": 0 if reverse else round(30 + 20 * math.sin(t / 10)),
                "coolantC": 88 + random.randint(-1, 1),
                "batteryV": round(14.1 + random.uniform(-0.1, 0.1), 1),
            }
        )
        await asyncio.sleep(0.2)


async def main() -> None:
    ap = argparse.ArgumentParser(description="car-bridge za Car OS")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--sim", action="store_true", help="simulirani podaci, bez vozila")
    ap.add_argument("--can", metavar="KANAL", help="SocketCAN kanal, npr. can0")
    ap.add_argument("--dbc", metavar="FAJL", help="DBC fajl (npr. opendbc vw_mqb_2010.dbc)")
    ap.add_argument("--reverse-gpio", type=int, metavar="PIN", help="BCM pin ulaza za rikverc")
    ap.add_argument("--park-key-gpio", type=int, metavar="PIN", help="BCM pin tastera P")
    ap.add_argument("--ignition-gpio", type=int, metavar="PIN", help="BCM pin ulaza za kontakt (+15)")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(asctime)s %(message)s")

    bridge = Bridge()
    tasks = []
    if args.sim:
        tasks.append(run_sim(bridge))
    if args.can:
        if not args.dbc:
            ap.error("--can zahteva --dbc")
        tasks.append(run_can(bridge, args.can, args.dbc))
    if any(p is not None for p in (args.reverse_gpio, args.park_key_gpio, args.ignition_gpio)):
        tasks.append(run_gpio(bridge, args.reverse_gpio, args.park_key_gpio, args.ignition_gpio))
    if not tasks:
        ap.error("izaberite bar jedan izvor: --sim, --can ili GPIO ulaze")

    async with websockets.serve(bridge.handler, args.host, args.port):
        log.info("Slusam na ws://%s:%d", args.host, args.port)
        await asyncio.gather(*tasks)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
