import { useEffect, useMemo, useRef, useState } from 'react'
import { AlbumArt } from '@/components/ui/AlbumArt'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { OemButton, TitleActions, TitleButton } from '@/components/oem/controls'
import { ConfirmDialog, OptionsDialog } from '@/components/oem/Dialog'
import { ListNote, RowCheck, RowLink, ScrollList } from '@/components/oem/List'
import { useNavigation } from '@/app/navigation'
import { useSettings } from '@/app/settings'
import { useScreenTitle, useShell } from '@/app/shell'
import { useAudio } from '@/hooks/useAudio'
import { formatDuration } from '@/hooks/useClock'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { audioService, filterAudioFiles, tracksFromFiles } from '@/services/audio'
import type { PlayMode } from '@/services/audio'
import { prefsService } from '@/services/prefs'

/** Skriveni dijalozi za izbor fajlova / foldera (zamena za USB medij u browseru). */
function useFilePickers() {
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    folderInput.current?.setAttribute('webkitdirectory', '')
  }, [])

  async function importFiles(files: File[]) {
    const audioFiles = filterAudioFiles(files)
    if (audioFiles.length === 0) return
    setImporting(true)
    try {
      audioService.addTracks(await tracksFromFiles(audioFiles))
    } finally {
      setImporting(false)
    }
  }

  const inputs = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => {
          void importFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          void importFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
    </>
  )
  return {
    inputs,
    importing,
    pickFiles: () => fileInput.current?.click(),
    pickFolder: () => folderInput.current?.click(),
  }
}

function currentMode(shuffle: boolean, repeat: 'off' | 'all' | 'one'): PlayMode {
  return shuffle ? 'shuffle' : repeat
}

const MODE_ICON: Record<PlayMode, IconName> = {
  off: 'repeat',
  one: 'repeat-one',
  all: 'repeat',
  shuffle: 'shuffle',
}

function SeekBar() {
  const audio = useAudio()
  const { t } = useT()
  const dragging = useRef(false)
  const ratio = audio.durationSec > 0 ? Math.min(1, audio.positionSec / audio.durationSec) : 0

  const seekTo = (el: HTMLElement, clientX: number) => {
    const rect = el.getBoundingClientRect()
    audioService.seek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * audio.durationSec)
  }

  return (
    <div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={t.media.seek}
        aria-valuemin={0}
        aria-valuemax={Math.round(audio.durationSec)}
        aria-valuenow={Math.round(audio.positionSec)}
        aria-valuetext={formatDuration(audio.positionSec)}
        className="relative flex h-10 cursor-pointer touch-none items-center"
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          seekTo(e.currentTarget, e.clientX)
        }}
        onPointerMove={(e) => dragging.current && seekTo(e.currentTarget, e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') audioService.seekBy(5)
          if (e.key === 'ArrowLeft') audioService.seekBy(-5)
        }}
      >
        <div className="relative h-[6px] w-full bg-surface-3">
          <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: ratio * 100 + '%', boxShadow: 'var(--accent-glow)' }} />
          <div
            className="absolute top-1/2 h-5 w-[6px] -translate-x-1/2 -translate-y-1/2 bg-white"
            style={{ left: ratio * 100 + '%' }}
          />
        </div>
      </div>
      <div className="flex justify-between text-small text-text-2 tabular-nums">
        <span>{formatDuration(audio.positionSec)}</span>
        <span>-{formatDuration(Math.max(0, audio.durationSec - audio.positionSec))}</span>
      </div>
    </div>
  )
}

function PlaybackStatus() {
  const audio = useAudio()
  const { t } = useT()
  const track = audio.queue[audio.index]
  let text = t.media.localFile
  if (!track) text = t.media.emptyLibrary
  else if (audio.error) text = t.media.playbackError
  else if (audio.loading) text = t.media.loadingFile
  else if (audio.ended) text = t.media.endOfList
  else if (audio.simulated) text = t.media.demoTrack
  return (
    <p className={'flex items-center gap-2 text-small ' + (audio.error ? 'text-warn' : 'text-text-3')}>
      {audio.error && <Icon name="warning" size={16} />}
      {text}
    </p>
  )
}

function MediaMain() {
  const audio = useAudio()
  const { push } = useNavigation()
  const { t } = useT()
  const track = audio.queue[audio.index]
  const mode = currentMode(audio.shuffle, audio.repeat)
  const modeLabels: Record<PlayMode, string> = {
    off: t.media.modeOff,
    one: t.media.modeOne,
    all: t.media.modeAll,
    shuffle: t.media.modeShuffle,
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 items-center gap-10 px-10">
        <AlbumArt track={track} size={268} rounded={2} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[38px] leading-tight font-light">{track?.title ?? t.media.noTrack}</p>
          <p className="mt-2 truncate text-title text-text-2">{track?.artist ?? '—'}</p>
          <p className="mt-1 truncate text-body-lg text-text-3">{track?.album ?? ''}</p>
          <div className="mt-8">
            <SeekBar />
          </div>
          <div className="mt-2 h-6">
            <PlaybackStatus />
          </div>
        </div>
      </div>

      {/* Kontrole reprodukcije */}
      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-line-soft px-6 py-4">
        <OemButton
          size="lg"
          active={mode !== 'off'}
          aria-label={t.media.mode + ': ' + modeLabels[mode]}
          onClick={() => audioService.cycleMode()}
          className="w-[150px] !gap-2.5"
        >
          <Icon name={MODE_ICON[mode]} size={24} />
          <span className="text-small">{modeLabels[mode]}</span>
        </OemButton>
        <OemButton
          size="lg"
          aria-label={t.media.prevTrack}
          onClick={() => audioService.previous()}
          onHold={() => audioService.seekBy(-10)}
          repeatMs={300}
          className="w-[120px]"
        >
          <Icon name="prev" size={28} />
        </OemButton>
        <OemButton
          size="lg"
          active
          aria-label={audio.playing ? t.media.pause : t.media.play}
          onClick={() => audioService.toggle()}
          className="w-[150px]"
        >
          <Icon name={audio.playing ? 'pause' : 'play'} size={32} strokeWidth={2.2} />
        </OemButton>
        <OemButton
          size="lg"
          aria-label={t.media.nextTrack}
          onClick={() => audioService.next()}
          onHold={() => audioService.seekBy(10)}
          repeatMs={300}
          className="w-[120px]"
        >
          <Icon name="next" size={28} />
        </OemButton>
        <OemButton size="lg" aria-label={t.media.titleList} onClick={() => push('list')} className="w-[150px] !gap-2.5">
          <Icon name="list" size={24} />
          <span className="text-small">{t.media.titleList}</span>
        </OemButton>
      </div>
    </div>
  )
}

/** Lista naslova po folderima izvora, kao na fabrickom uredjaju. */
function TitleList({ pickers }: { pickers: ReturnType<typeof useFilePickers> }) {
  const audio = useAudio()
  const { back } = useNavigation()
  const { t } = useT()
  const [folder, setFolder] = useState<string | null>(null)
  useScreenTitle(t.media.titleList)

  // Otvara se folder naslova koji se trenutno reprodukuje
  const currentFolder = audio.queue[audio.index]?.folder ?? ''
  const dir = folder ?? currentFolder

  const { subfolders, items } = useMemo(() => {
    const subs = new Set<string>()
    const list: { track: (typeof audio.queue)[number]; index: number }[] = []
    audio.queue.forEach((track, index) => {
      const f = track.folder ?? ''
      if (f === dir) list.push({ track, index })
      else if (dir === '' ? f !== '' : f.startsWith(dir + '/')) {
        const rest = dir === '' ? f : f.slice(dir.length + 1)
        subs.add(rest.split('/')[0])
      }
    })
    return { subfolders: [...subs].sort(), items: list }
  }, [audio, dir])

  const parent = dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : ''

  return (
    <div className="flex h-full flex-col">
      <TitleActions>
        <TitleButton onClick={pickers.pickFiles}>
          <Icon name="plus" size={18} /> {t.media.addFiles}
        </TitleButton>
        <TitleButton onClick={pickers.pickFolder}>
          <Icon name="folder" size={18} /> {t.media.addFolder}
        </TitleButton>
      </TitleActions>
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-5 text-small text-text-2">
        <Icon name="usb" size={18} />
        <span className="truncate">
          {t.media.usb1} / {dir || t.media.root}
        </span>
        <span className="ml-auto tabular-nums">
          {pickers.importing ? t.media.loadingTags : `${items.length} ${t.media.tracks}`}
        </span>
      </div>
      <ScrollList>
        {dir !== '' && (
          <RowLink label={t.media.folderUp} icon="folder-up" onClick={() => setFolder(parent)} />
        )}
        {subfolders.map((name) => (
          <RowLink key={name} label={name} icon="folder" onClick={() => setFolder(dir ? dir + '/' + name : name)} />
        ))}
        {items.map(({ track, index }) => {
          const active = index === audio.index
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => {
                audioService.playIndex(index)
                back()
              }}
              className={[
                'relative flex min-h-16 w-full items-center gap-4 border-b border-line-soft px-5 text-left',
                active ? 'bg-accent-soft' : '',
              ].join(' ')}
            >
              {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
              <AlbumArt track={track} size={44} rounded={2} />
              <span className="min-w-0 flex-1">
                <span className={'block truncate text-body ' + (active ? 'text-accent-ink' : '')}>{track.title}</span>
                <span className="block truncate text-small text-text-3">{track.artist}</span>
              </span>
              {active && audio.playing && <Icon name="volume" size={18} className="text-accent-ink" />}
              <span className="text-small text-text-3 tabular-nums">
                {track.durationSec > 0 ? formatDuration(track.durationSec) : '--:--'}
              </span>
            </button>
          )
        })}
        {audio.queue.length === 0 && <ListNote>{t.media.emptyLibrary}</ListNote>}
      </ScrollList>
    </div>
  )
}

function MediaSettings() {
  const prefs = usePrefs()
  const audio = useAudio()
  const { go } = useNavigation()
  const { notify } = useShell()
  const { t } = useT()
  const [confirmEject, setConfirmEject] = useState(false)
  useScreenTitle(t.media.settingsTitle)
  const hasLocal = audio.queue.some((tr) => tr.src)

  return (
    <>
      <ScrollList>
        <RowLink label={t.media.set.sound} icon="volume" onClick={() => go('sound')} />
        <RowCheck
          label={t.media.set.subfolders}
          checked={prefs['media.subfolders']}
          onChange={(v) => prefsService.set('media.subfolders', v)}
        />
        <RowLink label={t.media.set.bluetooth} icon="bluetooth" onClick={() => go('settings', ['bluetooth'])} />
        <RowLink
          label={t.media.set.safeRemove}
          icon="eject"
          disabled={!hasLocal}
          onClick={() => setConfirmEject(true)}
        />
        <RowCheck label={t.media.set.tp} checked={prefs['radio.tp']} onChange={(v) => prefsService.set('radio.tp', v)} />
      </ScrollList>
      <ConfirmDialog
        open={confirmEject}
        title={t.media.set.safeRemove}
        message={t.setup.safeRemoveConfirm}
        onConfirm={() => {
          audioService.setQueue(audio.queue.filter((tr) => !tr.src))
          notify(t.setup.safeRemoveDone)
        }}
        onClose={() => setConfirmEject(false)}
      />
    </>
  )
}

type SourceId = 'usb1' | 'usb2' | 'sd1' | 'sd2' | 'cd' | 'aux' | 'btAudio'

export function MediaScreen() {
  const { path, push } = useNavigation()
  const { update } = useSettings()
  const { t } = useT()
  const pickers = useFilePickers()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const sub = path[0]

  useEffect(() => {
    update('audioSource', 'media')
  }, [update])

  const sources: { value: SourceId; label: string; disabled?: boolean }[] = [
    { value: 'usb1', label: `${t.media.usb1} — ${t.media.usb1Hint}` },
    { value: 'usb2', label: `${t.media.usb2} — ${t.common.notConnected}`, disabled: true },
    { value: 'sd1', label: `${t.media.sd1} — ${t.common.notConnected}`, disabled: true },
    { value: 'sd2', label: `${t.media.sd2} — ${t.common.notConnected}`, disabled: true },
    { value: 'cd', label: `${t.media.cd} — ${t.common.notConnected}`, disabled: true },
    { value: 'aux', label: `${t.media.aux} — ${t.common.notConnected}`, disabled: true },
    { value: 'btAudio', label: `${t.media.btAudio} — ${t.common.notConnected}`, disabled: true },
  ]

  return (
    <div className="flex h-full flex-col">
      {pickers.inputs}
      {!sub && (
        <TitleActions>
          <TitleButton onClick={() => setSourcesOpen(true)} aria-label={t.media.sources}>
            <Icon name="usb" size={18} /> {t.media.usb1} <Icon name="chevron-down" size={16} />
          </TitleButton>
          <TitleButton onClick={() => push('settings')} aria-label={t.common.settings}>
            <Icon name="settings" size={20} />
          </TitleButton>
        </TitleActions>
      )}

      {sub === 'list' ? <TitleList pickers={pickers} /> : sub === 'settings' ? <MediaSettings /> : <MediaMain />}

      <OptionsDialog
        open={sourcesOpen}
        title={t.media.sources}
        value={'usb1' as SourceId}
        options={sources}
        onSelect={() => undefined}
        onClose={() => setSourcesOpen(false)}
      />
    </div>
  )
}
