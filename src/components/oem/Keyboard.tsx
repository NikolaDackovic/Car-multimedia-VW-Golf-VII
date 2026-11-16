import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { useShell } from '@/app/shell'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'

/**
 * Tastatura na ekranu (fabricka "maska za unos" MIB2).
 *
 * Gore je red za unos sa kursorom, ispod tasteri. Raspored (QWERTZ ili
 * abecedni) i srpska slova biraju se u Podesavanjima → Tastatura.
 * Za brojeve telefona otvara se numericka tastatura.
 */
type Layer = 'letters' | 'symbols'

const QWERTZ = [
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['y', 'x', 'c', 'v', 'b', 'n', 'm'],
]
const ABC = [
  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
  ['k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
  ['t', 'u', 'v', 'w', 'x', 'y', 'z'],
]
const SYMBOLS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['@', '#', '&', '*', '(', ')', '-', '+', '/', '_'],
  [',', '.', '?', '!', "'", '"', ':', ';'],
]
const PHONE = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

function Key({
  label,
  onPress,
  wide = 1,
  accent = false,
  active = false,
  ariaLabel,
}: {
  label: ReactNode
  onPress: () => void
  wide?: number
  accent?: boolean
  active?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-active={active || accent}
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      className="oem-btn flex h-[66px] items-center justify-center text-[24px] font-normal active:brightness-150"
      style={{ flex: wide }}
    >
      {label}
    </button>
  )
}

export function Keyboard() {
  const { keyboard, closeKeyboard } = useShell()
  const prefs = usePrefs()
  const { t } = useT()
  const [value, setValue] = useState('')
  const [layer, setLayer] = useState<Layer>('letters')
  const [shift, setShift] = useState(false)

  useEffect(() => {
    if (!keyboard) return
    setValue(keyboard.value)
    setLayer('letters')
    // Prvo slovo velikim slovom, kao na fabrickoj tastaturi
    setShift(keyboard.value.length === 0 && (keyboard.mode ?? 'text') === 'text')
  }, [keyboard])

  if (!keyboard) return null
  const mode = keyboard.mode ?? 'text'
  const max = keyboard.maxLength ?? 40

  const type = (ch: string) => {
    setValue((v) => (v.length >= max ? v : v + (shift ? ch.toUpperCase() : ch)))
    if (shift) setShift(false)
  }
  const backspace = () => setValue((v) => v.slice(0, -1))
  const done = () => {
    keyboard.onDone(value.trim())
    closeKeyboard()
  }

  const base = prefs['kbd.layout'] === 'abc' ? ABC : QWERTZ
  const letters = base.map((row) => [...row])
  if (prefs['kbd.serbian']) {
    if (prefs['kbd.layout'] === 'abc') letters[2].push('č', 'ć', 'đ')
    else letters[0].push('š', 'đ')
    if (prefs['kbd.layout'] === 'abc') letters[1].push('š', 'ž')
    else letters[1].push('č', 'ć', 'ž')
  }
  const rows = layer === 'letters' ? letters : SYMBOLS

  return (
    <AnimatePresence>
      <motion.div
        key="kbd"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.16 }}
        className="absolute inset-0 z-40 flex flex-col bg-bg"
        role="dialog"
        aria-label={keyboard.title}
      >
        {/* Red za unos */}
        <div className="flex h-[88px] shrink-0 items-center gap-4 border-b border-line px-5">
          <div className="min-w-0 flex-1">
            <p className="text-small text-text-3">{keyboard.title}</p>
            <p className="mt-1 flex h-10 items-center overflow-hidden border-b-2 border-accent text-[28px] whitespace-pre">
              <span className="truncate">{value}</span>
              <span className="ml-0.5 inline-block h-8 w-[2px] animate-pulse bg-accent" />
            </p>
          </div>
          <button
            type="button"
            aria-label={t.keyboard.close}
            onClick={closeKeyboard}
            className="oem-btn flex size-14 items-center justify-center"
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        {mode === 'text' ? (
          <div className="flex flex-1 flex-col justify-end gap-2 p-3">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2">
                {i === 2 && (
                  <Key
                    label={<Icon name="arrow-up" size={24} />}
                    ariaLabel={t.keyboard.shift}
                    active={shift}
                    wide={1.5}
                    onPress={() => setShift((s) => !s)}
                  />
                )}
                {row.map((ch) => (
                  <Key key={ch} label={shift ? ch.toUpperCase() : ch} onPress={() => type(ch)} />
                ))}
                {i === 2 && (
                  <Key
                    label={<Icon name="backspace" size={26} />}
                    ariaLabel={t.keyboard.backspace}
                    wide={1.5}
                    onPress={backspace}
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Key
                label={layer === 'letters' ? t.keyboard.numbers : t.keyboard.letters}
                wide={1.6}
                onPress={() => setLayer((l) => (l === 'letters' ? 'symbols' : 'letters'))}
              />
              <Key label="-" onPress={() => type('-')} />
              <Key label={t.keyboard.space} wide={5} onPress={() => type(' ')} />
              <Key label="." onPress={() => type('.')} />
              <Key label={t.keyboard.ok} wide={2} accent onPress={done} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center gap-6 p-4">
            <div className="grid w-[420px] grid-cols-3 gap-2">
              {PHONE.filter((k) => mode === 'phone' || /\d/.test(k)).map((k) => (
                <Key key={k} label={k} onPress={() => type(k)} />
              ))}
            </div>
            <div className="flex w-[200px] flex-col gap-2">
              {mode === 'phone' && <Key label="+" onPress={() => type('+')} />}
              {mode === 'phone' && <Key label={t.keyboard.space} onPress={() => type(' ')} />}
              <Key label={<Icon name="backspace" size={26} />} ariaLabel={t.keyboard.backspace} onPress={backspace} />
              <Key label={t.keyboard.ok} accent onPress={done} />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
