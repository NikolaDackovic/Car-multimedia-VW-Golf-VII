import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { MenuIcon } from '@/components/oem/MenuIcon'
import { OemButton, TitleActions, TitleButton } from '@/components/oem/controls'
import { RowStep } from '@/components/oem/List'
import { Dialog } from '@/components/oem/Dialog'
import { useShell } from '@/app/shell'
import { usePictures } from '@/hooks/usePictures'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { fill } from '@/i18n'
import { picturesService } from '@/services/pictures'
import { prefsService } from '@/services/prefs'

/**
 * Slike (fabricki meni "Slike"): pregled fotografija sa USB/SD medija,
 * prikaz jedne slike preko celog ekrana i prezentacija.
 */
export function PicturesScreen() {
  const { pictures } = usePictures()
  const prefs = usePrefs()
  const { notify } = useShell()
  const { t } = useT()
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const [slideshow, setSlideshow] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dragX = useRef<number | null>(null)

  useEffect(() => {
    folderInput.current?.setAttribute('webkitdirectory', '')
  }, [])

  // Prezentacija: sledeca slika posle izabranog trajanja
  useEffect(() => {
    if (!slideshow || pictures.length === 0) return
    const id = window.setInterval(
      () => setViewing((i) => ((i ?? 0) + 1) % pictures.length),
      prefs['media.slideshowSec'] * 1000,
    )
    return () => window.clearInterval(id)
  }, [slideshow, pictures.length, prefs])

  const add = (files: FileList | null) => {
    const n = picturesService.addFiles(Array.from(files ?? []))
    if (n > 0) notify(fill(t.pictures.count, { n }))
  }

  const step = (d: number) =>
    setViewing((i) => (i === null || pictures.length === 0 ? i : (i + d + pictures.length) % pictures.length))

  return (
    <div className="relative flex h-full flex-col">
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      <input ref={folderInput} type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />

      <TitleActions>
        {pictures.length > 0 && (
          <TitleButton
            active={slideshow}
            onClick={() => {
              setSlideshow((s) => !s)
              setViewing((i) => i ?? 0)
            }}
          >
            <Icon name={slideshow ? 'pause' : 'play'} size={18} /> {slideshow ? t.pictures.stopSlideshow : t.pictures.slideshow}
          </TitleButton>
        )}
        <TitleButton onClick={() => fileInput.current?.click()}>
          <Icon name="plus" size={18} /> {t.pictures.addFiles}
        </TitleButton>
        <TitleButton onClick={() => folderInput.current?.click()}>
          <Icon name="folder" size={18} /> {t.pictures.addFolder}
        </TitleButton>
        <TitleButton onClick={() => setSettingsOpen(true)} aria-label={t.common.settings}>
          <Icon name="settings" size={20} />
        </TitleButton>
      </TitleActions>

      {pictures.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <MenuIcon name="pictures" size={120} />
          <p className="text-title">{t.pictures.empty}</p>
          <p className="max-w-[520px] text-body text-text-3">{t.pictures.hint}</p>
        </div>
      ) : (
        <div className="touch-scroll grid flex-1 grid-cols-5 content-start gap-3 p-4">
          {pictures.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setViewing(i)}
              className="aspect-[4/3] overflow-hidden border border-line bg-surface-1"
            >
              <img src={p.url} alt={p.name} className="size-full object-cover" draggable={false} />
            </button>
          ))}
          <div className="col-span-5 flex justify-end pt-2">
            <OemButton size="sm" onClick={() => { picturesService.clear(); setViewing(null); setSlideshow(false) }}>
              <Icon name="trash" size={18} /> {t.pictures.clear}
            </OemButton>
          </div>
        </div>
      )}

      {/* Prikaz jedne slike */}
      <AnimatePresence>
        {viewing !== null && pictures[viewing] && (
          <motion.div
            key="viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black"
            onPointerDown={(e) => (dragX.current = e.clientX)}
            onPointerUp={(e) => {
              if (dragX.current === null) return
              const dx = e.clientX - dragX.current
              dragX.current = null
              if (dx < -60) step(1)
              else if (dx > 60) step(-1)
            }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={pictures[viewing].id}
                src={pictures[viewing].url}
                alt={pictures[viewing].name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            </AnimatePresence>
            <div className="prox absolute inset-x-0 bottom-0 flex items-center gap-3 p-4" style={{ background: 'linear-gradient(to top, #000c, transparent)' }}>
              <OemButton aria-label={t.pictures.prev} onClick={() => step(-1)}>
                <Icon name="chevron-left" size={24} />
              </OemButton>
              <span className="flex-1 truncate text-center text-body text-text-2">
                {pictures[viewing].name} · {viewing + 1}/{pictures.length}
              </span>
              <OemButton aria-label={t.pictures.next} onClick={() => step(1)}>
                <Icon name="chevron-right" size={24} />
              </OemButton>
              <OemButton onClick={() => { setViewing(null); setSlideshow(false) }}>
                <Icon name="grid" size={20} /> {t.pictures.grid}
              </OemButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={settingsOpen} title={t.common.settings} onClose={() => setSettingsOpen(false)} width={640}>
        <RowStep
          label={t.pictures.interval}
          value={prefs['media.slideshowSec']}
          min={3}
          max={30}
          onChange={(v) => prefsService.set('media.slideshowSec', v)}
          format={(v) => v + ' ' + t.common.seconds}
        />
      </Dialog>
    </div>
  )
}
