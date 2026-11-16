import { useSettings } from '@/app/settings'
import { DICTS, LOCALES } from '@/i18n'
import type { Dict, Lang } from '@/i18n'

/**
 * Prevodi za aktivni jezik. Vraca i locale, da datumi i brojevi prate jezik.
 * Srpski koristi latinicu ('sr-Latn-RS'), nikada cirilicu.
 */
export function useT(): { t: Dict; lang: Lang; locale: string } {
  const { settings } = useSettings()
  const lang = settings.language
  return { t: DICTS[lang], lang, locale: LOCALES[lang] }
}
