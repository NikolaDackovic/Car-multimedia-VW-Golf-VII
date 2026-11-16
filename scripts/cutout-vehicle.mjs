/**
 * Izrezivanje mog automobila iz fotografija (jednokratna obrada, ne radi u aplikaciji).
 *
 *   npm run vehicle:cutout
 *
 * Za svaku fotografiju pozadina se uklanja "rastom regiona" od ivica slike: piksel postaje
 *     pozadina ako je dovoljno slican susednom pikselu pozadine. Rast staje na
 *     ostrim ivicama — a karoserija je tamno teget naspram svetle garaze.
 * Teget boja karoserije je zasticena i nikada se ne proglasava pozadinom.
 * Zadrzava se najveca povezana celina (vozilo), ivice se omeksaju, a slika
 *     se iseca na okvir vozila i snima kao PNG sa providnom pozadinom.
 *
 * Ovo nije ML segmentacija — rezultat treba pogledati, a pragovi su po slici.
 */
import { Jimp } from 'jimp'
import { mkdirSync } from 'node:fs'

/** Koordinate obelezene na prikazu fotografije 2000x1500 -> udeli. */
const px = (points) => points.map(([x, y]) => [x / 2000, y / 1500])

const SRC = 'public/vehicle/'
const OUT = 'public/vehicle/cutout/'
const WIDTH = 1600

/**
 * box:   [x0, y0, x1, y1] okvir u kome je vozilo — sve van njega je pozadina
 * dark:  pikseli tamniji od ovoga (gume, stakla) se nikad ne brisu; senka na podu je svetlija
 * exclude: dodatni pravougaonici koji su sigurno pozadina (stub, drugo vozilo)
 */
const JOBS = [
  {
    src: 'side-right.jpg',
    out: 'side-right.png',
    tol: 22,
    dark: 38,
    box: [0.01, 0.3, 0.99, 0.83],
    exclude: [[0, 0.3, 0.036, 0.52]],
  },
  {
    src: 'side-left.jpg',
    out: 'side-left.png',
    tol: 22,
    dark: 38,
    box: [0.04, 0.29, 0.96, 0.77],
    exclude: [
      [0, 0, 0.2, 0.46],
      [0, 0, 0.078, 0.53],
    ],
  },
  {
    src: 'front.jpg',
    out: 'front-view.png',
    tol: 22,
    dark: 38,
    box: [0.08, 0.07, 0.92, 0.93],
  },
  {
    src: 'rear.jpg',
    out: 'rear-view.png',
    tol: 22,
    dark: 38,
    box: [0.08, 0.07, 0.92, 0.93],
  },
  {
    src: 'front-quarter-right.jpg',
    out: 'front-quarter-right.png',
    tol: 22,
    dark: 38,
    box: [0.08, 0.1, 0.94, 0.94],
  },
  {
    src: 'front-quarter.jpg',
    out: 'front-quarter.png',
    tol: 22,
    dark: 38,
    box: [0.133, 0.212, 0.91, 0.84],
    columnFill: false,
    // Rucno obrisana kontura vozila: sece sve sto je van automobila
    outline: px([
      [285, 1065], [300, 1100], [420, 1140], [650, 1180], [1000, 1205], [1170, 1215],
      [1230, 1245], [1330, 1252], [1420, 1215], [1450, 1150], [1460, 1020], [1560, 965],
      [1650, 925], [1700, 945], [1770, 920], [1805, 860], [1815, 760], [1800, 660],
      [1760, 560], [1720, 470], [1660, 380], [1600, 340], [1500, 325], [1300, 320],
      [1080, 328], [960, 340], [900, 360], [840, 400], [720, 480], [640, 560], [560, 600],
      [470, 640], [380, 685], [320, 710], [290, 760], [275, 830], [270, 950],
    ]),
    // Stakla i krov: odbijaju svetao plafon pa ih rast regiona brise — popunjavaju se rucno
    fill: [
      px([
        [650, 560], [720, 500], [840, 400], [905, 360], [965, 342], [1080, 330], [1300, 322],
        [1500, 328], [1590, 345], [1650, 385], [1700, 450], [1725, 505], [1690, 525],
        [1440, 600], [1420, 612], [1350, 600], [1200, 595], [900, 585], [700, 580],
      ]),
      // Hauba: odsjaj plafona je cini svetlom kao zid
      px([
        [300, 720], [380, 688], [470, 645], [560, 605], [645, 565], [700, 585], [1360, 605],
        [1420, 615], [1420, 760], [1300, 795], [330, 795],
      ]),
      // Bocni panel i zadnji blatobran: odbijaju svetao zid garaze
      px([
        [1360, 605], [1440, 605], [1700, 525], [1740, 545], [1795, 640], [1810, 760],
        [1800, 860], [1760, 905], [1650, 922], [1560, 962], [1465, 1015], [1445, 900],
        [1420, 800],
      ]),
    ],
  },
]

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b

/** Teget karoserija: plava dominira nad crvenom, a nije svetla povrsina. */
const isCarBlue = (r, g, b) => b - r > 28 && b > 55 && luma(r, g, b) < 150

function inPolygon(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function boxBlurAlpha(alpha, W, H, radius) {
  const tmp = new Float32Array(W * H)
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0, n = 0
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k
        if (xx >= 0 && xx < W) { s += alpha[y * W + xx]; n++ }
      }
      tmp[y * W + x] = s / n
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0, n = 0
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k
        if (yy >= 0 && yy < H) { s += tmp[yy * W + x]; n++ }
      }
      out[y * W + x] = s / n
    }
  }
  return out
}

async function processJob(job) {
  const img = await Jimp.read(SRC + job.src)
  img.resize({ w: WIDTH })

  const { width: W, height: H, data } = img.bitmap
  const soft = img.clone().blur(2)
  const sd = soft.bitmap.data

  // ---- 1. Rast pozadine od ivica ----
  const bg = new Uint8Array(W * H)
  const queue = new Int32Array(W * H)
  let head = 0, tail = 0
  const push = (p) => { bg[p] = 1; queue[tail++] = p }

  const protectedPx = (p) => {
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2]
    return isCarBlue(r, g, b) || luma(r, g, b) < job.dark
  }

  // Sve van okvira vozila je pozadina i odatle krece rast
  const [bx0, by0, bx1, by1] = job.box
  const X0 = Math.round(bx0 * W), X1 = Math.round(bx1 * W)
  const Y0 = Math.round(by0 * H), Y1 = Math.round(by1 * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < X0 || x >= X1 || y < Y0 || y >= Y1) push(y * W + x)
    }
  }
  for (const [ex0, ey0, ex1, ey1] of job.exclude ?? []) {
    for (let y = Math.round(ey0 * H); y < Math.round(ey1 * H); y++) {
      for (let x = Math.round(ex0 * W); x < Math.round(ex1 * W); x++) {
        const q = y * W + x
        if (!bg[q]) push(q)
      }
    }
  }

  while (head < tail) {
    const p = queue[head++]
    const x = p % W, y = (p / W) | 0
    const i = p * 4
    const neighbors = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]
    for (const n of neighbors) {
      if (n < 0 || bg[n]) continue
      if (protectedPx(n)) continue
      const j = n * 4
      const d = Math.abs(sd[i] - sd[j]) + Math.abs(sd[i + 1] - sd[j + 1]) + Math.abs(sd[i + 2] - sd[j + 2])
      if (d < job.tol) push(n)
    }
  }

  // ---- 1b. Otvaranje maske ----
  // Erozija pa dilatacija: kida tanke mostove izmedju vozila i ostataka pozadine,
  // da popunjavanje po kolonama ne bi produzilo te ostatke u stepenice.
  const R = job.open ?? 4
  const minFilter = (src, horizontal) => {
    const out = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let v = 1
        for (let k = -R; k <= R && v; k++) {
          const xx = horizontal ? x + k : x
          const yy = horizontal ? y : y + k
          if (xx < 0 || yy < 0 || xx >= W || yy >= H || !src[yy * W + xx]) v = 0
        }
        out[y * W + x] = v
      }
    }
    return out
  }
  const maxFilter = (src, horizontal) => {
    const out = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let v = 0
        for (let k = -R; k <= R && !v; k++) {
          const xx = horizontal ? x + k : x
          const yy = horizontal ? y : y + k
          if (xx >= 0 && yy >= 0 && xx < W && yy < H && src[yy * W + xx]) v = 1
        }
        out[y * W + x] = v
      }
    }
    return out
  }
  const fg = new Uint8Array(W * H)
  for (let p = 0; p < W * H; p++) fg[p] = bg[p] ? 0 : 1
  const opened = maxFilter(maxFilter(minFilter(minFilter(fg, true), false), true), false)
  for (let p = 0; p < W * H; p++) bg[p] = opened[p] && fg[p] ? 0 : 1

  // ---- 2. Najveca celina vozila ----
  const label = new Int32Array(W * H).fill(-1)
  let best = -1, bestSize = 0, current = 0
  for (let p = 0; p < W * H; p++) {
    if (bg[p] || label[p] !== -1) continue
    let size = 0
    head = 0; tail = 0
    queue[tail++] = p; label[p] = current
    while (head < tail) {
      const q = queue[head++]
      size++
      const x = q % W, y = (q / W) | 0
      const nb = [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1]
      for (const n of nb) {
        if (n >= 0 && !bg[n] && label[n] === -1) { label[n] = current; queue[tail++] = n }
      }
    }
    if (size > bestSize) { bestSize = size; best = current }
    current++
  }

  // ---- 2b. Popunjavanje po kolonama ----
  // Silueta automobila je vertikalno konveksna: sve izmedju krova i donje ivice
  // je vozilo. Ovo vraca haubu i stakla koja odbijaju svetlu pozadinu.
  for (let x = 0; x < W && job.columnFill !== false; x++) {
    let top = -1, bottom = -1
    for (let y = 0; y < H; y++) {
      if (label[y * W + x] === best) { if (top < 0) top = y; bottom = y }
    }
    if (top < 0) continue
    for (let y = top; y <= bottom; y++) label[y * W + x] = best
  }

  // ---- 2c. Rucna kontura ----
  if (job.outline) {
    const keep = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x
        const nx = x / W, ny = y / H
        if (!inPolygon(nx, ny, job.outline)) continue
        const filled = (job.fill ?? []).some((poly) => inPolygon(nx, ny, poly))
        if (filled || label[p] === best) keep[p] = 1
      }
    }
    // Rupe unutar konture (odsjaji na haubi) do kojih spolja ne moze da se dodje
    const outside = new Uint8Array(W * H)
    head = 0; tail = 0
    for (let x = 0; x < W; x++) { for (const p of [x, (H - 1) * W + x]) if (!keep[p]) { outside[p] = 1; queue[tail++] = p } }
    for (let y = 0; y < H; y++) { for (const p of [y * W, y * W + W - 1]) if (!keep[p] && !outside[p]) { outside[p] = 1; queue[tail++] = p } }
    while (head < tail) {
      const q = queue[head++]
      const x = q % W, y = (q / W) | 0
      const nb = [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1]
      for (const n of nb) if (n >= 0 && !keep[n] && !outside[n]) { outside[n] = 1; queue[tail++] = n }
    }
    for (let p = 0; p < W * H; p++) label[p] = outside[p] ? -1 : best
  }

  // ---- 3. Maska, omeksane ivice, okvir ----
  const alpha = new Float32Array(W * H)
  let minX = W, minY = H, maxX = 0, maxY = 0
  for (let p = 0; p < W * H; p++) {
    if (label[p] === best) {
      alpha[p] = 255
      const x = p % W, y = (p / W) | 0
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const feathered = boxBlurAlpha(alpha, W, H, 1)
  for (let p = 0; p < W * H; p++) data[p * 4 + 3] = Math.round(feathered[p])

  const pad = 18
  const cx = Math.max(0, minX - pad)
  const cy = Math.max(0, minY - pad)
  const cw = Math.min(W, maxX + pad) - cx
  const ch = Math.min(H, maxY + pad) - cy
  img.crop({ x: cx, y: cy, w: cw, h: ch })

  await img.write(OUT + job.out)
  const coverage = ((bestSize / (W * H)) * 100).toFixed(1)
  console.log(`${job.out}: ${cw}x${ch}, vozilo ${coverage}% kadra`)
}

mkdirSync(OUT, { recursive: true })
for (const job of JOBS) await processJob(job)
