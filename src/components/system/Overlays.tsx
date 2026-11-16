import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { VOLUME_STEPS } from '@/app/volume'
import { useShell } from '@/app/shell'
import { useAudio } from '@/hooks/useAudio'
import { useT } from '@/hooks/useT'

/** Prikaz glasnoce posle pritiska + / − (nestaje posle 2 s), kao na fabrickom ekranu. */
export function VolumeOverlay() {
  const { volumeShownAt } = useShell()
  const audio = useAudio()
  const { t } = useT()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!volumeShownAt) return
    setVisible(true)
    const id = window.setTimeout(() => setVisible(false), 2000)
    return () => window.clearTimeout(id)
  }, [volumeShownAt])

  const level = audio.muted ? 0 : Math.round(audio.volume * VOLUME_STEPS)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="vol"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.14 }}
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-[72px] left-1/2 z-30 flex w-[560px] -translate-x-1/2 items-center gap-4 border border-line-strong px-5 py-4"
          style={{ background: 'var(--surface-1)', boxShadow: 'var(--shadow-3)' }}
        >
          <Icon name={level === 0 ? 'volume-off' : 'volume'} size={26} />
          <div className="flex h-6 flex-1 items-end gap-[3px]">
            {Array.from({ length: VOLUME_STEPS }, (_, i) => (
              <span
                key={i}
                className="flex-1"
                style={{
                  height: 6 + (i / VOLUME_STEPS) * 18,
                  background: i < level ? 'var(--accent)' : 'var(--surface-3)',
                  boxShadow: i < level ? 'var(--accent-glow)' : undefined,
                }}
              />
            ))}
          </div>
          <span className="w-16 text-right text-title font-medium tabular-nums">
            {level === 0 ? t.volume.muted : level}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Kratko obavestenje pri dnu ekrana (npr. "Stanica je memorisana"). */
export function Toast() {
  const { toast } = useShell()
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.16 }}
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-[72px] left-1/2 z-30 -translate-x-1/2 border border-line-strong px-6 py-3.5 text-body"
          style={{ background: 'var(--surface-1)', boxShadow: 'var(--shadow-3)' }}
        >
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
