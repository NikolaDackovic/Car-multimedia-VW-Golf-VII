import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { Checkbox, OemButton } from '@/components/oem/controls'
import { ListNote, RowCheck, RowSelect, RowStep, ScrollList } from '@/components/oem/List'
import { VOLUME_STEPS } from '@/app/volume'
import { useSettings } from '@/app/settings'
import { useAudio } from '@/hooks/useAudio'
import { usePrefs } from '@/hooks/usePrefs'
import { useSound } from '@/hooks/useSound'
import { useT } from '@/hooks/useT'
import { audioService } from '@/services/audio'
import { prefsService } from '@/services/prefs'
import { soundService } from '@/services/sound'

type Tab = 'volume' | 'eq' | 'balance'
const RANGE = 7

function VolumeTab() {
  const p = usePrefs()
  const audio = useAudio()
  const { update } = useSettings()
  const { t } = useT()
  const level = audio.muted ? 0 : Math.round(audio.volume * VOLUME_STEPS)
  const lmh = [
    { value: 'low' as const, label: t.common.low },
    { value: 'medium' as const, label: t.common.medium },
    { value: 'high' as const, label: t.common.high },
  ]

  return (
    <ScrollList>
      <RowStep
        label={t.sound.systemVolume}
        value={level}
        min={0}
        max={VOLUME_STEPS}
        onChange={(v) => {
          audioService.setMuted(false)
          audioService.setVolume(v / VOLUME_STEPS)
          update('volume', v / VOLUME_STEPS)
        }}
      />
      <RowStep label={t.sound.announce} value={p['sound.announce']} min={0} max={30} onChange={(v) => prefsService.set('sound.announce', v)} />
      <RowStep label={t.sound.maxOn} value={p['sound.maxOn']} min={5} max={30} onChange={(v) => prefsService.set('sound.maxOn', v)} />
      <RowSelect
        label={t.sound.gala}
        value={p['sound.gala']}
        options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 0 ? t.common.off : String(n) }))}
        onSelect={(v) => prefsService.set('sound.gala', v)}
      />
      <RowSelect label={t.sound.aux} value={p['sound.aux']} options={lmh} onSelect={(v) => prefsService.set('sound.aux', v)} />
      <RowSelect label={t.sound.bt} value={p['sound.bt']} options={lmh} onSelect={(v) => prefsService.set('sound.bt', v)} />
      <RowCheck
        label={t.sound.parkReduction}
        checked={p['park.audioReduction']}
        onChange={(v) => prefsService.set('park.audioReduction', v)}
      />
    </ScrollList>
  )
}

/** Vertikalni klizac tona: − / + i traka sa podeocima, kao na fabrickom ekranu. */
function ToneSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(-RANGE, Math.min(RANGE, v)))
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-body-lg">{label}</span>
      <OemButton size="sm" aria-label={label + ' +'} disabled={value >= RANGE} onClick={() => set(value + 1)} className="!w-16">
        <Icon name="plus" size={20} />
      </OemButton>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={-RANGE}
        aria-valuemax={RANGE}
        aria-valuenow={value}
        className="flex h-[290px] w-20 cursor-pointer touch-none flex-col-reverse gap-[3px] py-1"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const r = 1 - (e.clientY - rect.top) / rect.height
          set(Math.round(r * RANGE * 2 - RANGE))
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') set(value + 1)
          if (e.key === 'ArrowDown') set(value - 1)
        }}
      >
        {Array.from({ length: RANGE * 2 + 1 }, (_, i) => {
          const step = i - RANGE
          const filled = step === 0 || (value > 0 ? step > 0 && step <= value : step < 0 && step >= value)
          return (
            <span
              key={i}
              className="mx-auto w-full flex-1"
              style={{
                background: step === 0 ? 'var(--text-3)' : filled ? 'var(--accent)' : 'var(--surface-3)',
                width: step === 0 ? '100%' : '72%',
                boxShadow: filled && step !== 0 ? 'var(--accent-glow)' : undefined,
              }}
            />
          )
        })}
      </div>
      <OemButton size="sm" aria-label={label + ' −'} disabled={value <= -RANGE} onClick={() => set(value - 1)} className="!w-16">
        <Icon name="minus" size={20} />
      </OemButton>
      <span className="text-title tabular-nums">{value > 0 ? '+' + value : value}</span>
    </div>
  )
}

function EqTab() {
  const s = useSound()
  const { t } = useT()
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center gap-20">
        <ToneSlider label={t.sound.bass} value={s.bass} onChange={(v) => soundService.set('bass', v)} />
        <ToneSlider label={t.sound.mid} value={s.mid} onChange={(v) => soundService.set('mid', v)} />
        <ToneSlider label={t.sound.treble} value={s.treble} onChange={(v) => soundService.set('treble', v)} />
      </div>
      <div className="flex items-center gap-4 border-t border-line-soft px-5 py-3">
        <OemButton size="sm" onClick={() => soundService.reset()}>
          <Icon name="refresh" size={18} /> {t.sound.eqReset}
        </OemButton>
        <p className="text-small leading-snug text-text-3">{t.sound.note}</p>
      </div>
    </div>
  )
}

/** Balans i fader: pogled na kabinu odozgo, krstic pokazuje raspodelu zvuka. */
function BalanceTab() {
  const s = useSound()
  const { t } = useT()
  const W = 300
  const H = 420
  const x = W / 2 + (s.balance / RANGE) * (W / 2 - 40)
  const y = H / 2 - (s.fader / RANGE) * (H / 2 - 60)

  const setBF = (balance: number, fader: number) => {
    soundService.set('balance', Math.max(-RANGE, Math.min(RANGE, balance)))
    soundService.set('fader', Math.max(-RANGE, Math.min(RANGE, fader)))
  }

  const arrow = (icon: IconName, label: string, db: number, df: number) => (
    <OemButton size="lg" aria-label={label} onClick={() => setBF(s.balance + db, s.fader + df)} className="!w-16 !px-0">
      <Icon name={icon} size={28} />
    </OemButton>
  )

  return (
    <div className="flex h-full items-center justify-center gap-14">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="cursor-crosshair touch-none"
        role="slider"
        aria-label={t.sound.balance}
        aria-valuetext={`${s.balance}, ${s.fader}`}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - rect.left) / rect.width) * W
          const py = ((e.clientY - rect.top) / rect.height) * H
          setBF(Math.round(((px - W / 2) / (W / 2 - 40)) * RANGE), Math.round(((H / 2 - py) / (H / 2 - 60)) * RANGE))
        }}
      >
        {/* Obris kabine */}
        <rect x="20" y="20" width={W - 40} height={H - 40} rx="70" fill="var(--surface-1)" stroke="var(--line-strong)" strokeWidth="2" />
        <path d={`M48 96 Q${W / 2} 66 ${W - 48} 96`} stroke="var(--line)" strokeWidth="2" fill="none" />
        {[
          [70, 140],
          [W - 130, 140],
          [70, 260],
          [W - 130, 260],
        ].map(([sx, sy]) => (
          <g key={sx + '-' + sy}>
            <rect x={sx} y={sy} width="60" height="70" rx="14" fill="var(--surface-3)" stroke="var(--line)" />
            <rect x={sx + 6} y={sy + 54} width="48" height="12" rx="5" fill="var(--line)" />
          </g>
        ))}
        {/* Zvucnici */}
        {[
          [26, 120],
          [W - 26, 120],
          [26, 320],
          [W - 26, 320],
        ].map(([cx, cy]) => (
          <circle key={cx + '-' + cy} cx={cx} cy={cy} r="7" fill="var(--text-3)" />
        ))}
        <line x1={x} x2={x} y1="30" y2={H - 30} stroke="var(--accent)" strokeWidth="1.5" opacity="0.7" />
        <line x1="30" x2={W - 30} y1={y} y2={y} stroke="var(--accent)" strokeWidth="1.5" opacity="0.7" />
        <circle cx={x} cy={y} r="13" fill="var(--accent)" style={{ filter: 'drop-shadow(0 0 6px var(--accent))' }} />
        <text x={W / 2} y="14" textAnchor="middle" fontSize="13" fill="var(--text-3)">{t.sound.front}</text>
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="13" fill="var(--text-3)">{t.sound.rear}</text>
      </svg>

      <div className="grid grid-cols-3 gap-2">
        <span />
        {arrow('chevron-up', t.sound.front, 0, 1)}
        <span />
        {arrow('chevron-left', t.common.left, -1, 0)}
        <OemButton size="lg" aria-label={t.sound.center} onClick={() => setBF(0, 0)} className="!w-16 !px-0">
          <Icon name="navigate" size={22} />
        </OemButton>
        {arrow('chevron-right', t.common.right, 1, 0)}
        <span />
        {arrow('chevron-down', t.sound.rear, 0, -1)}
        <span />
        <p className="col-span-3 mt-3 text-center text-body text-text-2 tabular-nums">
          {s.balance === 0 ? t.sound.center : (s.balance < 0 ? t.common.left : t.common.right) + ' ' + Math.abs(s.balance)}
          {' · '}
          {s.fader === 0 ? t.sound.center : (s.fader > 0 ? t.sound.front : t.sound.rear) + ' ' + Math.abs(s.fader)}
        </p>
      </div>
    </div>
  )
}

/** Zvuk (fabricki taster SOUND): glasnoce, ton, balans/fader i ton ekrana. */
export function SoundScreen() {
  const { settings, update } = useSettings()
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('volume')
  const tabs: { id: Tab; icon: IconName; label: string }[] = [
    { id: 'volume', icon: 'volume', label: t.sound.volume },
    { id: 'eq', icon: 'equalizer', label: t.sound.eq },
    { id: 'balance', icon: 'navigate', label: t.sound.balance },
  ]

  return (
    <div className="flex h-full">
      <nav className="flex w-[268px] shrink-0 flex-col border-r border-line-soft py-2">
        {tabs.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => setTab(item.id)}
              className="relative flex h-[96px] items-center gap-4 px-5 text-left"
            >
              {active && <span className="oem-frame absolute inset-2" aria-hidden="true" />}
              <Icon name={item.icon} size={26} className={'relative ' + (active ? 'text-accent-ink' : 'text-text-2')} />
              <span className={'relative text-body-lg leading-tight ' + (active ? 'text-text-1' : 'text-text-2')}>
                {item.label}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          role="checkbox"
          aria-checked={settings.touchSounds}
          onClick={() => update('touchSounds', !settings.touchSounds)}
          className="mt-auto flex h-[80px] items-center gap-4 border-t border-line-soft px-5 text-left"
        >
          <Checkbox checked={settings.touchSounds} />
          <span className="text-body leading-tight">{t.sound.touchTone}</span>
        </button>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        {tab === 'volume' && <VolumeTab />}
        {tab === 'eq' && <EqTab />}
        {tab === 'balance' && <BalanceTab />}
        {tab === 'volume' && <ListNote>{t.sound.note}</ListNote>}
      </div>
    </div>
  )
}
