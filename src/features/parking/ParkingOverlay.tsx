import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { SimTag } from '@/components/oem/controls'
import { useParking } from '@/hooks/useParking'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { fill } from '@/i18n'
import { parkingService, zoneOf } from '@/services/parking'
import type { ParkState } from '@/services/parking'
import { ParkSensors } from './ParkSensors'
import { VehicleView } from '@/features/vehicle/VehicleView'

/**
 * Parkiranje: ista funkcija za svaku opremu vozila.
 *  - samo senzori → fabricki OPS prikaz (vozilo odozgo, zute/crvene zone)
 *  - kamera → slika kamere preko celog ekrana sa pomocnim linijama
 *  - kamera i senzori → kamera preko celog ekrana + mali OPS levo
 * Otvara se pri ubacivanju u rikverc ili tasterom P; zatvara se dugmetom,
 * tasterom P ili iznad 15 km/h.
 */
export function ParkingOverlay() {
  const park = useParking()
  return <AnimatePresence>{park.visible && <ParkingView key="park" park={park} />}</AnimatePresence>
}

function nearestCm(p: ParkState, front: boolean): number | null {
  let best: number | null = null
  const check = (list: (number | null)[], isFront: boolean) =>
    list.forEach((cm, i) => {
      if (cm === null || zoneOf(cm, isFront, i === 0 || i === 3) === null) return
      if (best === null || cm < best) best = cm
    })
  if (front) check(p.front, true)
  check(p.rear, false)
  return best
}

/**
 * Moj auto u 3D iz pticije perspektive, sa zonama senzora preko njega. Okvir
 * uvek ima odnos crteza zona (520:720), pa se model i zone tacno poklapaju —
 * i na celom ekranu i u malom prikazu pored kamere.
 */
function SensorsBox({ park, frontEnabled }: { park: ParkState; frontEnabled: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ containerType: 'size' }}>
      <div className="relative" style={{ width: 'min(100cqw, calc(100cqh * 520 / 720))', height: 'min(100cqh, calc(100cqw * 720 / 520))' }}>
        <VehicleView view="parkTop" bare priority snap className="absolute inset-0" />
        <ParkSensors front={park.front} rear={park.rear} frontEnabled={frontEnabled} fault={park.fault} className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  )
}

function SideButton({ icon, label, onClick, active }: { icon: IconName; label: string; onClick: () => void; active?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.08 }}
      className={
        'flex h-[72px] w-[84px] flex-col items-center justify-center gap-1 border text-caption ' +
        (active ? 'border-accent text-white' : 'border-line text-text-2')
      }
      style={{ background: active ? 'var(--accent-fill)' : 'rgba(10,12,16,0.78)', boxShadow: active ? 'var(--accent-glow)' : undefined, borderRadius: 'var(--radius-btn)' }}
    >
      <Icon name={icon} size={24} />
      <span className="max-w-full truncate px-1">{label}</span>
    </motion.button>
  )
}

function ParkingView({ park }: { park: ParkState }) {
  const prefs = usePrefs()
  const { t } = useT()
  const hw = prefs['hw.park']
  const hasCamera = hw === 'camera' || hw === 'both'
  const hasSensors = hw === 'sensors' || hw === 'both'
  const frontEnabled = prefs['hw.parkFront']
  const showCamera = park.view === 'camera' && hasCamera
  const near = nearestCm(park, frontEnabled)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className="absolute inset-0 z-[46] overflow-hidden bg-black"
      role="dialog"
      aria-label={showCamera ? t.park.camera : t.park.title}
    >
      {showCamera ? (
        <CameraView mirror={prefs['hw.cameraMirror']} guidelines={prefs['park.guidelines']} deviceId={prefs['hw.cameraId']} />
      ) : (
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 48%, #18202c 0%, #07090c 62%, #000 100%)' }} />
      )}

      {/* Senzori: preko celog ekrana ili mali prikaz levo preko kamere */}
      {hasSensors && !showCamera && (
        <div className="absolute inset-x-0 top-[64px] bottom-[64px]">
          <SensorsBox park={park} frontEnabled={frontEnabled} />
        </div>
      )}
      {hasSensors && showCamera && (
        <div
          className="absolute top-[88px] bottom-[24px] left-[24px] w-[230px] overflow-hidden border border-line p-2"
          style={{ background: 'rgba(5,7,10,0.82)', borderRadius: 'var(--radius-panel)' }}
        >
          <SensorsBox park={park} frontEnabled={frontEnabled} />
        </div>
      )}

      {/* Gornja traka */}
      <div className="absolute inset-x-0 top-0 flex h-16 items-center gap-4 px-6" style={{ background: 'linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0))' }}>
        <Icon name={showCamera ? 'camera' : 'parking'} size={26} className="text-accent-ink" />
        <h2 className="text-title">{showCamera ? t.park.camera : t.park.title}</h2>
        {park.reverse && (
          <span className="flex size-9 items-center justify-center border-2 border-text-1 text-body-lg font-bold" aria-label="R">
            R
          </span>
        )}
        <span className="flex-1" />
        <SimTag />
      </div>

      {/* Desna kolona dugmadi (kao na fabrickom prikazu) */}
      <div className="absolute top-[88px] right-6 flex flex-col gap-3">
        <SideButton icon="close" label={t.park.close} onClick={() => parkingService.close()} />
        {hasSensors && (
          <SideButton
            icon={park.muted ? 'volume-off' : 'volume'}
            label={park.muted ? t.park.unmute : t.park.mute}
            active={park.muted}
            onClick={() => parkingService.toggleMute()}
          />
        )}
        {hasSensors && hasCamera && (
          <SideButton
            icon={showCamera ? 'sensors' : 'camera'}
            label={showCamera ? t.park.viewSensors : t.park.viewCamera}
            onClick={() => parkingService.setView(showCamera ? 'sensors' : 'camera')}
          />
        )}
      </div>

      {/* Donja poruka */}
      <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center gap-3 px-6" style={{ background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.85))' }}>
        {park.fault ? (
          <p className="flex items-center gap-2 text-body text-warn">
            <Icon name="warning" size={20} /> {t.park.fault}
          </p>
        ) : (
          <p className="text-body text-text-2">
            {t.park.checkSurroundings}
            {hasSensors && near !== null && (
              <span className="ml-3 tabular-nums" style={{ color: near < 30 ? 'var(--danger)' : 'var(--warn)' }}>
                {fill(t.park.nearest, { value: near + ' cm' })}
              </span>
            )}
          </p>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Slika kamere za voznju unazad. Kamera se u Linux racunar povezuje kao USB
 * video uredjaj (UVC kamera ili USB video grabber za analognu kameru), pa je
 * dostupna preko getUserMedia — isto kao web kamera.
 */
function CameraView({ deviceId, mirror, guidelines }: { deviceId: string; mirror: boolean; guidelines: boolean }) {
  const { t } = useT()
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'starting' | 'ok' | 'error'>('starting')

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), width: { ideal: 1280 }, height: { ideal: 720 } },
    }
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no media')
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (cancelled) return
        if (video.current) {
          video.current.srcObject = stream
          await video.current.play().catch(() => undefined)
        }
        setStatus('ok')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    void start()
    // Ako kamera ne odgovori (nije povezana, nema dozvole), posle 6 s se prikazuje poruka
    const timeout = window.setTimeout(() => {
      if (!stream && !cancelled) setStatus('error')
    }, 6000)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [deviceId])

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={video}
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: mirror ? 'scaleX(-1)' : undefined, opacity: status === 'ok' ? 1 : 0, transition: 'opacity 200ms' }}
      />
      {status === 'ok' && guidelines && <Guidelines />}
      {status === 'starting' && (
        <p className="absolute inset-0 flex items-center justify-center text-body text-text-3">{t.park.cameraStarting}</p>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-[22%] text-center">
          <Icon name="camera" size={44} className="text-text-3" />
          <p className="text-title">{t.park.cameraError}</p>
          <p className="text-small text-text-3">{t.park.cameraErrorHint}</p>
        </div>
      )}
    </div>
  )
}

/** Staticne pomocne linije (kao fabricka kamera bez dinamike volana): crveno ~0,5 m, zuto ~1 m, zeleno ~2 m. */
function Guidelines() {
  // Bocne linije se suzavaju ka horizontu; poprecne oznake na rastojanjima
  const marks = [
    { y: 610, color: 'var(--danger)' },
    { y: 505, color: 'var(--warn)' },
    { y: 400, color: 'var(--ok)' },
  ]
  const xAt = (y: number, side: -1 | 1) => 640 + side * (190 + ((y - 330) / (720 - 330)) * 230)
  return (
    <svg viewBox="0 0 1280 720" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      {([-1, 1] as const).map((side) => (
        <g key={side} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d={`M${xAt(720, side)} 720 L${xAt(610, side)} 610`} stroke="var(--danger)" />
          <path d={`M${xAt(610, side)} 610 L${xAt(505, side)} 505`} stroke="var(--warn)" />
          <path d={`M${xAt(505, side)} 505 L${xAt(360, side)} 360`} stroke="var(--ok)" />
        </g>
      ))}
      {marks.map((m) => (
        <g key={m.y} stroke={m.color} strokeWidth="6" strokeLinecap="round">
          <path d={`M${xAt(m.y, -1)} ${m.y} l${m.y > 600 ? 70 : 50} 0`} />
          <path d={`M${xAt(m.y, 1)} ${m.y} l${m.y > 600 ? -70 : -50} 0`} />
        </g>
      ))}
    </svg>
  )
}
