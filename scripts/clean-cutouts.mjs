/**
 * Doterivanje vec izrezanih slika vozila (jednokratna obrada, menja PNG na mestu).
 *
 *   npm run vehicle:clean
 *
 * 1. Podna senka: ispod praga, izmedju tockova, ostala je siva traka poda iz garaze.
 *    Pod je neutralno siv (r = g = b), a karoserija i prag imaju plavi ton — zato se
 *    svaka kolona u razmaku izmedju tockova brise odozdo nagore dok je piksel neutralan.
 * 2. Oreol: na ivicama siluete ostaju svetli pikseli zida garaze. Svetao, nezasicen
 *    piksel u uskom pojasu uz providnu pozadinu se brise.
 *
 * Rezultat treba pogledati. Razmaci izmedju tockova su izmereni po slici.
 */
import { Jimp } from 'jimp'

const DIR = 'public/vehicle/cutout/'

/** gap: [x0, x1] u pikselima slike — samo izmedju tockova, da se gume ne diraju */
const JOBS = [
  { file: 'side-right.png', gap: [368, 1122] },
  { file: 'side-left.png', gap: [388, 1052] },
  { file: 'front-quarter.png' },
  { file: 'front-quarter-right.png' },
  { file: 'front-view.png' },
  { file: 'rear-view.png' },
]

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b
const spread = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b)

async function clean({ file, gap }) {
  const img = await Jimp.read(DIR + file)
  const { width: W, height: H, data } = img.bitmap
  const a = (x, y) => data[(y * W + x) * 4 + 3]

  // ---- 1. Podna senka ----
  let floor = 0
  if (gap) {
    // Donja ivica praga po koloni: prvi piksel odozdo koji nije neutralno siv
    const [g0, g1] = gap
    const sill = []
    for (let x = g0; x <= g1; x++) {
      let edge = 0
      for (let y = H - 1; y >= 0; y--) {
        const i = (y * W + x) * 4
        if (data[i + 3] !== 0 && spread(data[i], data[i + 1], data[i + 2]) > 3) { edge = y; break }
      }
      sill.push(edge)
    }
    // Sum (pojedinacni obojeni pikseli poda) pravi "kapljice" — linija se izgladjuje medijanom
    const R = 30
    for (let x = g0; x <= g1; x++) {
      const win = sill.slice(Math.max(0, x - g0 - R), x - g0 + R + 1).sort((p, q) => p - q)
      const line = win[win.length >> 1]
      for (let y = line + 1; y < H; y++) {
        const i = (y * W + x) * 4
        if (data[i + 3]) { data[i + 3] = 0; floor++ }
      }
      // Omeksan prelaz na samoj ivici praga
      const i = (line * W + x) * 4
      data[i + 3] = Math.min(data[i + 3], 170)
    }
    // Uz gume: pod je svetlije siv od gume — brise se samo on, odozdo nagore
    const FLANK = 70
    for (const [f0, f1] of [[g0 - FLANK, g0 - 1], [g1 + 1, g1 + FLANK]]) {
      for (let x = Math.max(0, f0); x <= Math.min(W - 1, f1); x++) {
        for (let y = H - 1; y >= 0; y--) {
          const i = (y * W + x) * 4
          if (data[i + 3] === 0) continue
          const r = data[i], g = data[i + 1], b = data[i + 2]
          if (spread(r, g, b) > 3 || luma(r, g, b) < 31) break
          data[i + 3] = 0
          floor++
        }
      }
    }
  }

  // ---- 2. Oreol na ivicama ----
  const BAND = 4
  const nearEdge = (x, y) => {
    for (let dy = -BAND; dy <= BAND; dy++) {
      for (let dx = -BAND; dx <= BAND; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= W || yy >= H || a(xx, yy) < 40) return true
      }
    }
    return false
  }
  const halo = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      if (data[i + 3] === 0) continue
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (luma(r, g, b) > 150 && spread(r, g, b) < 40 && nearEdge(x, y)) halo.push(i)
    }
  }
  for (const i of halo) data[i + 3] = 0

  await img.write(DIR + file)
  console.log(`${file}: pod ${floor} px, oreol ${halo.length} px`)
}

for (const job of JOBS) await clean(job)
