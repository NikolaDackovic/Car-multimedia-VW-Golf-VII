import { sr } from './sr'
import { en } from './en'
import type { Dict } from './sr'

export type Lang = 'sr' | 'en'
export type { Dict }

export const DICTS: Record<Lang, Dict> = { sr, en }

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'sr', label: 'Srpski', short: 'SR' },
  { id: 'en', label: 'English', short: 'EN' },
]

/**
 * Locale za datume i brojeve. Za srpski se koristi latinica —
 * 'sr-RS' bi dao cirilicu.
 */
export const LOCALES: Record<Lang, string> = {
  sr: 'sr-Latn-RS',
  en: 'en-GB',
}

/** Umece vrednosti u tekst: fill('Posle {h} h', { h: 2 }) */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}
