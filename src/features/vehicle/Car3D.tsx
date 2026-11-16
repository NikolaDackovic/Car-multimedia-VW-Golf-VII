import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { vehicleProfile } from '@/services/vehicle/profile'
import type { CarPart } from './VehicleRender'
import type { BulbId } from './bulbs'
export { BULBS } from './bulbs'
export type { BulbId } from './bulbs'

/**
 * 3D prikaz vozila u stilu fabrickih prezentacija (VW / BMW / Audi):
 * auto stoji na putu, put se pojavljuje i "tece" ka vozilu, tockovi se
 * okrecu pa usporavaju, a kamera klizi do kadra. Kadrovi su fiksni —
 * dodirom se vozilo ne okrece.
 *
 * Model: "2019 Volkswagen Golf R" — Ddiaz Design, Sketchfab, licenca
 * CC BY-NC-SA 4.0 (navedeno u Podesavanja → Autorska prava). Karoserija se
 * boji u boju mog automobila.
 *
 * Sve radi bez interneta (lokalni model, okruzenje za refleksije iz scene,
 * put se crta u kodu). Scena se iscrtava samo dok se nesto pomera.
 */
/**
 * Optimizovana kopija modela (meshopt geometrija + WebP teksture 1024 px): 3,2 MB umesto 18,5 MB,
 * pa se ucitava nekoliko puta brze. Original je volkswagen_golf_r.glb; nova kopija se pravi sa
 *   npx @gltf-transform/cli optimize volkswagen_golf_r.glb golf7.glb --compress meshopt --texture-compress webp
 *     --texture-size 1024 --join false --flatten false --instance false --palette false --simplify false --prune false
 */
export const CAR_MODEL_URL = '/vehicle/golf7.glb'
const GOLF_LENGTH_M = 4.26

/** Kadrovi: 3/4 spreda, bocno, 3/4 pozadi i odozgo (pticja perspektiva). */
export type CarView = 'front' | 'frontRight' | 'side' | 'rear' | 'rearLeft' | 'rearRight' | 'rearCenter' | 'top' | 'parkTop' | 'chase' | 'bootSide'
export type WheelId = 'fl' | 'fr' | 'rl' | 'rr'



/** Mesto poruke na vozilu: deo karoserije ili sijalica. */
export type MarkerPart = CarPart | BulbId | WheelId
type Anchor = MarkerPart

/** Kadar iz kog se dato mesto najbolje vidi — kamera obilazi vozilo do kvara. */
export function viewForPart(part: MarkerPart): CarView {
  switch (part) {
    case 'fr':
    case 'headRight':
    case 'indicatorFrontRight':
    case 'fogRight':
    case 'mirrorRight':
      return 'frontRight'
    case 'rl':
    case 'tailLeft':
    case 'rearLowLeft':
    case 'rearLight':
    case 'rearWheel':
      return 'rearLeft'
    case 'rr':
    case 'tailRight':
    case 'rearLowRight':
      return 'rearRight'
    case 'brakeThird':
    case 'plate':
      return 'rearCenter'
    default:
      return 'front'
  }
}

export interface CarMarker {
  part: MarkerPart
  tone: 'ok' | 'warn' | 'danger'
  /** Tekst poruke koji se prikazuje dodirom na tacku. */
  title: string
  detail?: string
}

export interface WheelLabel {
  name: string
  value: string
  unit: string
  /** idle = merenje u toku (provera pritiska) */
  tone: 'ok' | 'warn' | 'idle'
}

export type WheelLabels = Record<WheelId, WheelLabel>

export interface Car3DProps {
  view?: CarView
  doors?: { driver: boolean; passenger: boolean; trunk: boolean }
  markers?: CarMarker[]
  /** Oznake pored tockova (pogled odozgo, kontrola pritiska u gumama). */
  wheelLabels?: WheelLabels | null
  /** Uvodna animacija (put koji tece, tockovi, prilaz kamere). */
  intro?: boolean
  /** Voznja: put tece ispod vozila i tockovi se okrecu (prikaz "Voznja"). */
  driving?: boolean
  /** false = bez puta (npr. ParkPilot, gde su oko vozila zone senzora). */
  road?: boolean
  /** Kamera odmah u kadru, bez klizanja (ParkPilot pri rikvercu). */
  snap?: boolean
  /** Otvara poruku na ovom mestu (npr. izabranu iz liste poruka). */
  focusPart?: MarkerPart | null
  /** Brzina kretanja puta u m/s dok je `driving` (npr. stvarna brzina vozila). */
  speed?: number
  className?: string
  /** Javlja se kada je prvi kadar sa modelom iscrtan. */
  onReady?: () => void
}

/* ------------------------------------------------------------------------ */
/*                             Priprema modela                              */
/* ------------------------------------------------------------------------ */

interface Pivot {
  pivot: THREE.Group
  axis: THREE.Vector3
  angle: number
}

interface Rig {
  root: THREE.Group
  box: THREE.Box3
  /** Uzorak tacaka karoserije — kadar se racuna po stvarnoj silueti, ne po kutiji */
  hull: THREE.Vector3[]
  pivots: Partial<Record<'driver' | 'passenger' | 'trunk', Pivot>>
  wheels: { pivot: THREE.Group; axis: THREE.Vector3; radius: number }[]
  anchors: Record<Anchor, THREE.Vector3>
  /** Pravac "napolje" za svako mesto — tacka se ne prikazuje kada je sa druge strane vozila. */
  normals: Partial<Record<Anchor, THREE.Vector3>>
}

function meshesMatching(root: THREE.Object3D, re: RegExp): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && re.test(o.name + ' ' + (o.parent?.name ?? ''))) out.push(o as THREE.Mesh)
  })
  return out
}

function boxOf(objects: THREE.Object3D[]): THREE.Box3 {
  const b = new THREE.Box3()
  for (const o of objects) b.expandByObject(o)
  return b
}

/**
 * Model se svodi na: duzina po X, prednji deo ka +X, gore +Y, tockovi na
 * y = 0, centar u (0, 0). U tom sistemu je leva strana vozila uvek −Z
 * (desna = napred × gore = +Z), pa ne zavisi od naziva delova u modelu.
 */
function buildRig(source: THREE.Object3D): Rig {
  const root = new THREE.Group()
  root.add(source.clone(true))
  root.updateMatrixWorld(true)

  let box = new THREE.Box3().setFromObject(root)
  let size = box.getSize(new THREE.Vector3())
  if (size.z > size.x) {
    root.rotation.y = Math.PI / 2
    root.updateMatrixWorld(true)
    box = new THREE.Box3().setFromObject(root)
  }
  const frontLights = meshesMatching(root, /Light_F/)
  if (frontLights.length && boxOf(frontLights).getCenter(new THREE.Vector3()).x < box.getCenter(new THREE.Vector3()).x) {
    root.rotation.y += Math.PI
    root.updateMatrixWorld(true)
    box = new THREE.Box3().setFromObject(root)
  }
  // Modeli iz FBX-a su cesto u centimetrima — svodi se na stvarnu duzinu Golfa VII
  size = box.getSize(new THREE.Vector3())
  root.scale.setScalar(GOLF_LENGTH_M / Math.max(size.x, 1e-6))
  root.updateMatrixWorld(true)
  box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  root.position.set(-center.x, -box.min.y, -center.z)
  root.updateMatrixWorld(true)

  // Materijali: boja mog auta, lak sa providnim slojem, jeftinije staklo
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      const phys = m as THREE.MeshPhysicalMaterial
      if ('transmission' in phys && phys.transmission > 0) {
        // Tonirano staklo: tamno i reflektujuce, bez skupe "transmission" obrade
        phys.transmission = 0
        phys.transparent = true
        phys.color.set('#07090c')
        phys.opacity = 0.72
        phys.roughness = 0.04
        phys.metalness = 0.4
        phys.needsUpdate = true
      }
      // Stakla prozora i krova (providnost 25%) — tamnija, da se ne vidi svetla tapacirana unutrasnjost
      if (m.name === 'glass' && m.transparent) {
        m.opacity = 0.82
        if ('color' in m) (m as THREE.MeshStandardMaterial).color.set('#05070a')
        m.needsUpdate = true
      }
      if (m.name === 'CarPaint' && 'color' in m) {
        phys.color.set(vehicleProfile.colorHex)
        phys.metalness = 0.7
        phys.roughness = 0.32
        if ('clearcoat' in phys) {
          phys.clearcoat = 1
          phys.clearcoatRoughness = 0.06
        }
      }
    }
  })

  const inverseRoot = root.quaternion.clone().invert()
  const localAxis = (world: THREE.Vector3) => world.clone().applyQuaternion(inverseRoot).normalize()
  const makePivot = (meshes: THREE.Mesh[], hingeWorld: THREE.Vector3) => {
    const pivot = new THREE.Group()
    root.add(pivot)
    pivot.position.copy(root.worldToLocal(hingeWorld.clone()))
    pivot.updateMatrixWorld(true)
    for (const m of meshes) pivot.attach(m)
    return pivot
  }

  const pivots: Rig['pivots'] = {}
  // Vrata: vozac levo (−Z), suvozac desno (+Z); sarka na prednjoj ivici
  for (const [key, re, side] of [
    ['driver', /Door_FL/, -1],
    ['passenger', /Door_FR/, 1],
  ] as const) {
    const meshes = meshesMatching(root, re)
    if (!meshes.length) continue
    const b = boxOf(meshes)
    const hinge = new THREE.Vector3(b.max.x, b.getCenter(new THREE.Vector3()).y, side > 0 ? b.max.z : b.min.z)
    pivots[key] = { pivot: makePivot(meshes, hinge), axis: localAxis(new THREE.Vector3(0, 1, 0)), angle: side * 1.0 }
  }
  // Prtljaznik sa spojlerom: sarka na gornjoj ivici, podize se nagore
  const trunk = meshesMatching(root, /SK_Trunk|SK_Spoiler/)
  if (trunk.length) {
    const b = boxOf(trunk)
    pivots.trunk = {
      pivot: makePivot(trunk, new THREE.Vector3(b.max.x, b.max.y, 0)),
      axis: localAxis(new THREE.Vector3(0, 0, 1)),
      angle: -1.1,
    }
  }

  // Tockovi: gume i felne, grupisane po cetvrtinama vozila; svaki dobija osovinu
  const groups: Record<WheelId, THREE.Mesh[]> = { fl: [], fr: [], rl: [], rr: [] }
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    if (!mats.some((m) => /tire|rim/i.test(m.name))) return
    const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3())
    groups[`${c.x > 0 ? 'f' : 'r'}${c.z < 0 ? 'l' : 'r'}` as WheelId].push(mesh)
  })
  box = new THREE.Box3().setFromObject(root)
  const len = box.max.x
  const h = box.max.y
  const halfW = box.max.z
  const wheelCenters = {} as Record<WheelId, THREE.Vector3>
  const wheels: Rig['wheels'] = []
  for (const id of ['fl', 'fr', 'rl', 'rr'] as WheelId[]) {
    const meshes = groups[id]
    const fallback = new THREE.Vector3(id[0] === 'f' ? len * 0.6 : -len * 0.62, 0.33, id[1] === 'l' ? -halfW * 0.85 : halfW * 0.85)
    if (!meshes.length) {
      wheelCenters[id] = fallback
      continue
    }
    const b = boxOf(meshes)
    const c = b.getCenter(new THREE.Vector3())
    wheelCenters[id] = c
    wheels.push({
      pivot: makePivot(meshes, c),
      axis: localAxis(new THREE.Vector3(0, 0, 1)),
      radius: Math.max(0.2, b.getSize(new THREE.Vector3()).y / 2),
    })
  }

  box = new THREE.Box3().setFromObject(root)
  const L = -1 // leva strana vozila
  const anchors: Record<Anchor, THREE.Vector3> = {
    frontLight: new THREE.Vector3(len * 0.93, h * 0.48, L * halfW * 0.62),
    rearLight: new THREE.Vector3(-len * 0.97, h * 0.62, L * halfW * 0.62),
    door: new THREE.Vector3(len * 0.05, h * 0.55, L * halfW * 1.02),
    frontWheel: wheelCenters.fl.clone().setZ(L * halfW * 0.98),
    rearWheel: wheelCenters.rl.clone().setZ(L * halfW * 0.98),
    bonnet: new THREE.Vector3(len * 0.62, h * 0.72, 0),
    cabin: new THREE.Vector3(-len * 0.05, h * 1.0, 0),
    // Za oznake guma: spoljna ivica svakog tocka
    fl: wheelCenters.fl.clone().setZ(-halfW * 1.02),
    fr: wheelCenters.fr.clone().setZ(halfW * 1.02),
    rl: wheelCenters.rl.clone().setZ(-halfW * 1.02),
    rr: wheelCenters.rr.clone().setZ(halfW * 1.02),
    // Sijalice (polozaji po obliku Golfa VII, u odnosu na dimenzije modela)
    headLeft: new THREE.Vector3(len * 0.9, h * 0.52, -halfW * 0.6),
    headRight: new THREE.Vector3(len * 0.9, h * 0.52, halfW * 0.6),
    indicatorFrontLeft: new THREE.Vector3(len * 0.84, h * 0.53, -halfW * 0.8),
    indicatorFrontRight: new THREE.Vector3(len * 0.84, h * 0.53, halfW * 0.8),
    fogLeft: new THREE.Vector3(len * 0.98, h * 0.24, -halfW * 0.68),
    fogRight: new THREE.Vector3(len * 0.98, h * 0.24, halfW * 0.68),
    mirrorLeft: new THREE.Vector3(len * 0.22, h * 0.7, -halfW * 1.0),
    mirrorRight: new THREE.Vector3(len * 0.22, h * 0.7, halfW * 1.0),
    tailLeft: new THREE.Vector3(-len * 0.96, h * 0.63, -halfW * 0.68),
    tailRight: new THREE.Vector3(-len * 0.96, h * 0.63, halfW * 0.68),
    rearLowLeft: new THREE.Vector3(-len * 0.99, h * 0.27, -halfW * 0.7),
    rearLowRight: new THREE.Vector3(-len * 0.99, h * 0.27, halfW * 0.7),
    brakeThird: new THREE.Vector3(-len * 0.86, h * 0.97, 0),
    plate: new THREE.Vector3(-len * 1.0, h * 0.42, 0),
  }
  const n = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize()
  const normals: Partial<Record<Anchor, THREE.Vector3>> = {
    frontLight: n(1, 0, -0.6),
    rearLight: n(-1, 0, -0.6),
    door: n(0, 0, -1),
    frontWheel: n(0, 0, -1),
    rearWheel: n(0, 0, -1),
    // Tockovi: i odozgo se vide (kontrola pritiska u gumama), sa suprotne strane ne
    fl: n(0, 1, -1),
    rl: n(0, 1, -1),
    fr: n(0, 1, 1),
    rr: n(0, 1, 1),
    headLeft: n(1, 0.1, -0.5),
    headRight: n(1, 0.1, 0.5),
    indicatorFrontLeft: n(0.8, 0, -0.8),
    indicatorFrontRight: n(0.8, 0, 0.8),
    fogLeft: n(1, 0, -0.4),
    fogRight: n(1, 0, 0.4),
    mirrorLeft: n(0.2, 0, -1),
    mirrorRight: n(0.2, 0, 1),
    tailLeft: n(-1, 0, -0.6),
    tailRight: n(-1, 0, 0.6),
    rearLowLeft: n(-1, 0, -0.4),
    rearLowRight: n(-1, 0, 0.4),
    brakeThird: n(-1, 0.6, 0),
    plate: n(-1, 0, 0),
  }

  return { root, box, hull: sampleHull(root), pivots, wheels, anchors, normals }
}

function sampleHull(root: THREE.Object3D, target = 6000): THREE.Vector3[] {
  root.updateMatrixWorld(true)
  const meshes: THREE.Mesh[] = []
  let total = 0
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry.attributes.position) {
      meshes.push(m)
      total += m.geometry.attributes.position.count
    }
  })
  const step = Math.max(1, Math.floor(total / target))
  const out: THREE.Vector3[] = []
  for (const m of meshes) {
    const pos = m.geometry.attributes.position
    for (let i = 0; i < pos.count; i += step) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld))
  }
  return out
}

/* ------------------------------------------------------------------------ */
/*                       Kadriranje (centriranje vozila)                    */
/* ------------------------------------------------------------------------ */

const DEG = Math.PI / 180
const VIEWS: Record<CarView, { az: number; el: number; up: THREE.Vector3; padX: number; padY: number; reserveX?: number; centerY?: number }> = {
  // az: ugao od prednjeg dela (+X) ka levoj strani (−Z); el: visina kamere
  front: { az: 38, el: 13, up: new THREE.Vector3(0, 1, 0), padX: 0.32, padY: 0.42 },
  side: { az: 90, el: 6, up: new THREE.Vector3(0, 1, 0), padX: 0.28, padY: 0.45 },
  rear: { az: 155, el: 9, up: new THREE.Vector3(0, 1, 0), padX: 0.32, padY: 0.42 },
  // Kadrovi za poruke na drugim stranama vozila (sijalice desno, pozadi...)
  frontRight: { az: -38, el: 13, up: new THREE.Vector3(0, 1, 0), padX: 0.32, padY: 0.42 },
  rearLeft: { az: 142, el: 14, up: new THREE.Vector3(0, 1, 0), padX: 0.32, padY: 0.42 },
  rearRight: { az: 218, el: 14, up: new THREE.Vector3(0, 1, 0), padX: 0.32, padY: 0.42 },
  rearCenter: { az: 180, el: 16, up: new THREE.Vector3(0, 1, 0), padX: 0.34, padY: 0.42 },
  // Odozgo: sa obe strane se cuva prostor za oznake tockova (px)
  top: { az: 90, el: 89.9, up: new THREE.Vector3(1, 0, 0), padX: 0.1, padY: 0.1, reserveX: 178 },
  // ParkPilot: duzina vozila tacno kao na crtezu zona (426 od 720 jedinica visine)
  // Ekran pokretanja: desni profil (prednji deo gleda nadesno, u smeru voznje), vozilo ispunjava okvir
  bootSide: { az: -90, el: 3, up: new THREE.Vector3(0, 1, 0), padX: 0.03, padY: 0.06 },
  // Instrumenti: tacno iza vozila i malo iznad; auto manji i nize, put se vidi u daljinu
  chase: { az: 180, el: 13, up: new THREE.Vector3(0, 1, 0), padX: 0.62, padY: 0.73, centerY: -0.3 },
  parkTop: { az: 90, el: 89.9, up: new THREE.Vector3(1, 0, 0), padX: 0.02, padY: 1 - 426 / 720 },
}
const FOV = 28

interface Shot {
  pos: THREE.Vector3
  look: THREE.Vector3
  up: THREE.Vector3
}

/**
 * Kadar u kom je vozilo tacno u sredini: kamera se postavi u pravcu
 * pogleda, projektuju se svih 8 temena kutije vozila, pa se tacka gledanja
 * pomera dok sredina projekcije ne padne u sredinu ekrana, a razdaljina se
 * menja dok vozilo ne popuni kadar (uz zadate margine).
 */
function computeShot(box: THREE.Box3, hull: THREE.Vector3[], view: CarView, widthPx: number, heightPx: number): Shot {
  const v = VIEWS[view]
  const aspect = widthPx / Math.max(1, heightPx)
  const padX = Math.min(0.8, Math.max(v.padX, v.reserveX ? (2 * v.reserveX) / Math.max(1, widthPx) + 0.03 : 0))
  const dir = new THREE.Vector3(
    Math.cos(v.el * DEG) * Math.cos(v.az * DEG),
    Math.sin(v.el * DEG),
    -Math.cos(v.el * DEG) * Math.sin(v.az * DEG),
  ).normalize()
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 100)
  const corners: THREE.Vector3[] = hull.length ? hull : []
  if (!corners.length)
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z))

  const look = box.getCenter(new THREE.Vector3())
  let dist = box.getSize(new THREE.Vector3()).length() * 1.6
  const p = new THREE.Vector3()
  const right = new THREE.Vector3()
  const camUp = new THREE.Vector3()
  for (let i = 0; i < 8; i++) {
    cam.position.copy(look).addScaledVector(dir, dist)
    cam.up.copy(v.up)
    cam.lookAt(look)
    cam.updateMatrixWorld(true)
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const c of corners) {
      p.copy(c).project(cam)
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    const halfH = Math.tan((FOV * DEG) / 2) * dist
    const halfW = halfH * aspect
    right.setFromMatrixColumn(cam.matrixWorld, 0)
    camUp.setFromMatrixColumn(cam.matrixWorld, 1)
    look.addScaledVector(right, ((minX + maxX) / 2) * halfW).addScaledVector(camUp, ((minY + maxY) / 2 - (v.centerY ?? 0)) * halfH)
    const scale = Math.max((maxX - minX) / 2 / (1 - padX), (maxY - minY) / 2 / (1 - v.padY))
    dist *= scale
  }
  return { pos: look.clone().addScaledVector(dir, dist), look, up: v.up.clone() }
}

/* ------------------------------------------------------------------------ */
/*                                   Put                                    */
/* ------------------------------------------------------------------------ */

const ROAD_LEN = 70
const ROAD_W = 7.2
const TILE_M = 9 // jedan ponovljeni segment puta (crta 3 m + razmak 6 m)

/** Asfalt sa ivicnim linijama i isprekidanom sredinom — crta se u kodu. */
function makeRoadTextures() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#16171a'
  g.fillRect(0, 0, 512, 512)
  // Zrnca asfalta
  for (let i = 0; i < 9000; i++) {
    const v = 22 + Math.random() * 26
    g.fillStyle = `rgb(${v},${v},${v + 2})`
    g.fillRect(Math.random() * 512, Math.random() * 512, 1.6, 1.6)
  }
  // Ivicne linije (pune) i sredisnja (isprekidana: 3 m od 9 m)
  g.fillStyle = 'rgba(225,228,232,0.5)'
  g.fillRect(0, 512 * 0.07, 512, 9)
  g.fillRect(0, 512 * 0.93 - 9, 512, 9)
  g.fillRect(0, 256 - 5, 512 * (3 / TILE_M), 10)
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  map.repeat.set(ROAD_LEN / TILE_M, 1)
  map.anisotropy = 4

  // Providnost: put bledi ka krajevima (horizontu) i ka bocnim ivicama
  const a = document.createElement('canvas')
  a.width = 256
  a.height = 64
  const ga = a.getContext('2d')!
  const along = ga.createLinearGradient(0, 0, 256, 0)
  along.addColorStop(0, '#000')
  along.addColorStop(0.32, '#fff')
  along.addColorStop(0.68, '#fff')
  along.addColorStop(1, '#000')
  ga.fillStyle = along
  ga.fillRect(0, 0, 256, 64)
  ga.globalCompositeOperation = 'multiply'
  const across = ga.createLinearGradient(0, 0, 0, 64)
  across.addColorStop(0, '#000')
  across.addColorStop(0.12, '#fff')
  across.addColorStop(0.88, '#fff')
  across.addColorStop(1, '#000')
  ga.fillStyle = across
  ga.fillRect(0, 0, 256, 64)
  const alpha = new THREE.CanvasTexture(a)
  return { map, alpha }
}

/* ------------------------------------------------------------------------ */
/*                                  Scena                                   */
/* ------------------------------------------------------------------------ */

type Projected = Partial<Record<Anchor, { x: number; y: number }>>

/**
 * Pripremljen model se cuva izmedju otvaranja ekrana (normalizacija, sarke
 * vrata, silueta), pa se prikaz pojavljuje odmah. Ako je vec prikazan na
 * drugom mestu, pravi se nova kopija.
 */
const rigCache = new WeakMap<THREE.Object3D, Map<string, Rig>>()
const rigInUse = new WeakSet<Rig>()
/** `slot` = prikaz (front, top...): svaki ekran ima svoju kopiju, pa prelaz izmedju kartica ne ceka. */
function useRig(scene: THREE.Object3D, slot: string): Rig {
  const rig = useMemo(() => {
    let slots = rigCache.get(scene)
    if (!slots) rigCache.set(scene, (slots = new Map()))
    const cached = slots.get(slot)
    if (cached && !rigInUse.has(cached)) {
      for (const p of Object.values(cached.pivots)) p?.pivot.quaternion.identity()
      return cached
    }
    const fresh = buildRig(scene)
    if (!cached) slots.set(slot, fresh)
    return fresh
  }, [scene])
  useEffect(() => {
    rigInUse.add(rig)
    return () => {
      rigInUse.delete(rig)
    }
  }, [rig])
  return rig
}

const INTRO_S = 1.9
const START_SPEED = 13 // m/s na pocetku uvodne animacije
const DRIVE_SPEED = 9 // m/s u prikazu "Voznja"
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function Scene({
  view,
  doors,
  intro,
  driving,
  road: showRoad,
  snap,
  speed: roadSpeed,
  onReady,
  parts,
  onProject,
}: Required<Pick<Car3DProps, 'view' | 'doors' | 'intro' | 'onReady' | 'driving' | 'road' | 'snap' | 'speed'>> & {
  parts: Anchor[]
  onProject: (p: Projected) => void
}) {
  const { scene } = useGLTF(CAR_MODEL_URL, false)
  const rig = useRig(scene, view)
  const road = useMemo(() => makeRoadTextures(), [])
  const roadMat = useRef<THREE.MeshStandardMaterial>(null)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const invalidate = useThree((s) => s.invalidate)
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)

  useEffect(() => () => {
    road.map.dispose()
    road.alpha.dispose()
  }, [road])

  // Kadar: cilj se racuna za svaki prikaz i velicinu panela
  const shot = useMemo(() => computeShot(rig.box, rig.hull, view, width, height), [rig, view, width, height])
  const current = useRef<Shot | null>(null)
  const introT = useRef(intro ? 0 : 1)
  const driveSpeed = useRef(0)
  // Stalna scena: uvodna animacija se pokrece kada je ekran zatrazi (prvo otvaranje)
  const firstIntro = useRef(true)
  useEffect(() => {
    if (firstIntro.current) {
      firstIntro.current = false
      return
    }
    if (!intro) return
    introT.current = 0
    current.current = null
    invalidate()
  }, [intro, invalidate])
  useEffect(() => {
    invalidate()
  }, [driving, invalidate])

  useEffect(() => {
    invalidate()
  }, [shot, invalidate])

  useEffect(() => {
    camera.fov = FOV
    camera.updateProjectionMatrix()
    const id = requestAnimationFrame(() => requestAnimationFrame(() => onReady()))
    return () => cancelAnimationFrame(id)
  }, [camera, onReady])

  // Vrata i prtljaznik
  const doorTarget = useRef({ driver: 0, passenger: 0, trunk: 0 })
  const doorState = useRef({ driver: 0, passenger: 0, trunk: 0 })
  useEffect(() => {
    doorTarget.current = { driver: +doors.driver, passenger: +doors.passenger, trunk: +doors.trunk }
    invalidate()
  }, [doors.driver, doors.passenger, doors.trunk, invalidate])

  const tmp = useMemo(() => new THREE.Vector3(), [])
  const tmpDir = useMemo(() => new THREE.Vector3(), [])
  const lastKey = useRef('')

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    let moving = false

    // Uvodna animacija: put se pojavljuje i tece, tockovi se okrecu i usporavaju
    if (introT.current < 1) {
      introT.current = Math.min(1, introT.current + delta / INTRO_S)
      moving = true
    }
    const t = introT.current
    // Voznja: meko ubrzanje i usporavanje do brzine kretanja
    driveSpeed.current += ((driving ? roadSpeed : 0) - driveSpeed.current) * (1 - Math.exp(-delta * 1.1))
    if (!driving && driveSpeed.current < 0.02) driveSpeed.current = 0
    if (driving || driveSpeed.current > 0) moving = true
    const speed = Math.max(START_SPEED * (1 - easeOutCubic(t)), driveSpeed.current)
    if (roadMat.current) {
      roadMat.current.opacity = Math.min(1, t / 0.3)
      road.map.offset.x += (speed * delta) / TILE_M
    }
    for (const w of rig.wheels) w.pivot.rotateOnAxis(w.axis, -(speed * delta) / w.radius)

    // Prvi kadar: kamera krece malo dalje i klizi ka vozilu
    if (!current.current) {
      const back = shot.pos.clone().sub(shot.look).multiplyScalar(intro ? 1.45 : 1).add(shot.look)
      current.current = { pos: back, look: shot.look.clone(), up: shot.up.clone() }
    }
    // Kamera klizi ka cilju (glatko, bez naglih pokreta)
    const cur = current.current
    if (cur) {
      // Prelaz izmedju kadrova ide po luku oko vozila (pravac i udaljenost
      // se menjaju zasebno), pa kamera "obilazi" auto umesto da prolazi kroz njega
      const k = snap ? 1 : 1 - Math.exp(-delta * (t < 1 ? 2.2 : 2.6))
      const offset = cur.pos.clone().sub(cur.look)
      const target = shot.pos.clone().sub(shot.look)
      const len = THREE.MathUtils.lerp(offset.length(), target.length(), k)
      const dir = offset.normalize().lerp(target.normalize(), k).normalize()
      cur.look.lerp(shot.look, k)
      cur.pos.copy(cur.look).addScaledVector(dir, len)
      cur.up.lerp(shot.up, k).normalize()
      camera.position.copy(cur.pos)
      camera.up.copy(cur.up)
      camera.lookAt(cur.look)
      if (cur.pos.distanceToSquared(shot.pos) > 1e-6 || cur.up.distanceToSquared(shot.up) > 1e-6) moving = true
    }

    // Vrata
    for (const key of ['driver', 'passenger', 'trunk'] as const) {
      const p = rig.pivots[key]
      if (!p) continue
      const c = doorState.current[key]
      const target = doorTarget.current[key]
      if (Math.abs(c - target) < 0.001) continue
      const next = c + Math.sign(target - c) * Math.min(Math.abs(target - c), delta * 1.5)
      doorState.current[key] = next
      p.pivot.quaternion.setFromAxisAngle(p.axis, p.angle * next * next * (3 - 2 * next))
      moving = true
    }

    // Projekcija tacaka oznaka (DOM preko platna)
    if (parts.length) {
      camera.updateMatrixWorld()
      const out: Projected = {}
      for (const part of parts) {
        // Mesto sa druge strane vozila se ne prikazuje (bilo bi "kroz" auto)
        const normal = rig.normals[part]
        if (normal && normal.dot(tmpDir.copy(camera.position).sub(rig.anchors[part])) < 0) continue
        tmp.copy(rig.anchors[part]).project(camera)
        if (tmp.z < 1) out[part] = { x: ((tmp.x + 1) / 2) * width, y: ((1 - tmp.y) / 2) * height }
      }
      const key = JSON.stringify(out, (_, v: unknown) => (typeof v === 'number' ? Math.round(v) : v))
      if (key !== lastKey.current) {
        lastKey.current = key
        onProject(out)
      }
    }

    if (moving) invalidate()
  })

  return (
    <>
      <primitive object={rig.root} />
      <mesh visible={showRoad} rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} renderOrder={-1}>
        <planeGeometry args={[ROAD_LEN, ROAD_W]} />
        <meshStandardMaterial
          ref={roadMat}
          map={road.map}
          alphaMap={road.alpha}
          transparent
          opacity={intro ? 0 : 1}
          roughness={0.92}
          metalness={0}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

/** Svetlo: meki reflektori i lokalno okruzenje za refleksije na laku. */
function Studio() {
  return (
    <>
      <ambientLight intensity={0.28} />
      <directionalLight position={[4, 8, 5]} intensity={1.6} />
      <directionalLight position={[-6, 4, -4]} intensity={0.5} />
      <Environment resolution={256} frames={1}>
        {/* Gornje svetlo kao dve uske trake pod uglom: lak dobija odsjaje, a ne belu povrsinu odozgo */}
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 2.6]} rotation-x={Math.PI / 2 + 0.35} scale={[12, 1.2, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[0, 6, -2.6]} rotation-x={Math.PI / 2 - 0.35} scale={[12, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, 2, 7]} scale={[12, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, 2, -7]} rotation-y={Math.PI} scale={[12, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[8, 2, 0]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="ring" color="#1a9ddd" intensity={0.6} position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={3} />
      </Environment>
      <ContactShadows position={[0, 0.004, 0]} opacity={0.85} scale={8} blur={2.2} far={2.5} resolution={512} frames={1} />
    </>
  )
}

const TONE_COLOR = { ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)' } as const
const WHEELS: WheelId[] = ['fl', 'fr', 'rl', 'rr']

export default function Car3D({
  view = 'front',
  doors = { driver: false, passenger: false, trunk: false },
  markers = [],
  wheelLabels = null,
  intro = true,
  driving = false,
  road = true,
  snap = false,
  speed = DRIVE_SPEED,
  focusPart = null,
  className = '',
  onReady = () => undefined,
}: Car3DProps) {
  const [points, setPoints] = useState<Projected>({})
  const [openMarker, setOpenMarker] = useState<MarkerPart | null>(null)
  useEffect(() => {
    setOpenMarker(focusPart ?? null)
  }, [focusPart])
  // Vise poruka na istom mestu (npr. oba prednja vrata) = jedna tacka sa svim porukama
  const groups = useMemo(() => {
    const rank = { ok: 0, warn: 1, danger: 2 } as const
    const map = new Map<MarkerPart, { part: MarkerPart; tone: CarMarker['tone']; items: CarMarker[] }>()
    for (const m of markers) {
      const g = map.get(m.part)
      if (!g) map.set(m.part, { part: m.part, tone: m.tone, items: [m] })
      else {
        g.items.push(m)
        if (rank[m.tone] > rank[g.tone]) g.tone = m.tone
      }
    }
    return [...map.values()]
  }, [markers])
  const [width, setWidth] = useState(0)
  const parts = useMemo<Anchor[]>(
    () => [...new Set<Anchor>([...markers.map((m) => m.part), ...(wheelLabels ? WHEELS : [])])],
    [markers, wheelLabels],
  )

  return (
    <div className={className} ref={(el) => {
        if (el && el.offsetWidth !== width) setWidth(el.offsetWidth)
      }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'low-power', alpha: true }}
        camera={{ position: [6, 2, -5], fov: FOV, near: 0.1, far: 120 }}
        style={{ pointerEvents: 'none' }}
        // Velicina platna se meri bez CSS skaliranja ekrana (scale), inace je
        // platno manje od okvira i vozilo nije centrirano
        resize={{ offsetSize: true }}
      >
        <Studio />
        <Scene view={view} doors={doors} intro={intro} driving={driving} road={road} snap={snap} speed={speed} onReady={onReady} parts={parts} onProject={setPoints} />
      </Canvas>

      {/* Oznake preko platna, na pozicijama projektovanim iz 3D modela */}
      <div className="pointer-events-none absolute inset-0" onPointerDown={() => setOpenMarker(null)}>
        {wheelLabels &&
          WHEELS.map((id) => {
            const p = points[id]
            if (!p) return null
            const w = wheelLabels[id]
            const left = id[1] === 'l'
            const color = w.tone === 'ok' ? 'var(--ok)' : w.tone === 'warn' ? 'var(--warn)' : 'var(--accent)'
            return (
              <div
                key={id}
                className="overlay-panel absolute flex w-[156px] flex-col px-3 py-2"
                style={{
                  left: p.x,
                  top: p.y,
                  transform: `translate(${left ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
                  borderColor: color,
                  borderLeftWidth: left ? 1 : 3,
                  borderRightWidth: left ? 3 : 1,
                }}
              >
                <span className="truncate text-caption text-text-3">{w.name}</span>
                <span
                  className={'text-[26px] leading-tight font-medium tabular-nums ' + (w.tone === 'idle' ? 'animate-pulse' : '')}
                  style={{ color: w.tone === 'idle' ? 'var(--text-2)' : color }}
                >
                  {w.value}
                  <span className="ml-1 text-small font-normal text-text-3">{w.unit}</span>
                </span>
              </div>
            )
          })}
        {groups.map((g) => {
          const p = points[g.part]
          if (!p) return null
          const color = TONE_COLOR[g.tone]
          const open = openMarker === g.part
          const toLeft = p.x > width / 2
          return (
            <div key={g.part} className="absolute" style={{ left: p.x, top: p.y }}>
              <button
                type="button"
                aria-label={g.items.map((m) => m.title).join(', ')}
                aria-expanded={open}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  setOpenMarker(open ? null : g.part)
                }}
                className="pointer-events-auto absolute flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              >
                <span
                  className="relative flex size-[30px] items-center justify-center rounded-full border-2"
                  style={{ borderColor: color, background: 'var(--overlay-bg)', boxShadow: open ? `0 0 0 4px color-mix(in srgb, ${color} 35%, transparent)` : undefined }}
                >
                  <span className="size-3 rounded-full" style={{ background: color }} />
                  {g.items.length > 1 && (
                    <span className="absolute -top-2 -right-2 flex size-[18px] items-center justify-center rounded-full text-[11px] font-bold text-black" style={{ background: color }}>
                      {g.items.length}
                    </span>
                  )}
                  {g.tone !== 'ok' && !open && (
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{ background: color, opacity: 0.3, animation: 'pulse-ring 2.4s ease-out infinite' }}
                    />
                  )}
                </span>
              </button>
              {open && (
                <div
                  role="status"
                  className="overlay-panel pointer-events-auto absolute top-0 w-[260px] -translate-y-1/2 px-4 py-3"
                  style={{
                    [toLeft ? 'right' : 'left']: 30,
                    borderColor: color,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {g.items.map((m, j) => (
                    <div key={j} className={j ? 'mt-2.5 border-t border-line-soft pt-2.5' : ''}>
                      <p className="text-small font-semibold" style={{ color: TONE_COLOR[m.tone] }}>
                        {m.title}
                      </p>
                      {m.detail && <p className="mt-1 text-caption leading-snug text-text-2">{m.detail}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

useGLTF.preload(CAR_MODEL_URL, false)
