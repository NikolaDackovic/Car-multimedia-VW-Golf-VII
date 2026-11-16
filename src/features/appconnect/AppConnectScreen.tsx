import { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { MenuIcon } from '@/components/oem/MenuIcon'
import { OemButton, TitleActions, TitleButton } from '@/components/oem/controls'
import { Dialog } from '@/components/oem/Dialog'
import { ListNote, RowCheck, ScrollList } from '@/components/oem/List'
import { useNavigation } from '@/app/navigation'
import { useScreenTitle } from '@/app/shell'
import { usePrefs } from '@/hooks/usePrefs'
import { useT } from '@/hooks/useT'
import { prefsService } from '@/services/prefs'

type Tech = 'carplay' | 'androidAuto' | 'mirrorlink'

const TECH_ICON: Record<Tech, IconName> = {
  carplay: 'phone',
  androidAuto: 'navigate',
  mirrorlink: 'devices',
}

function AppConnectSettings() {
  const prefs = usePrefs()
  const { t } = useT()
  useScreenTitle(t.appconnect.settingsTitle)
  return (
    <ScrollList>
      <RowCheck
        label={t.appconnect.set.vwData}
        checked={prefs['app.vwData']}
        onChange={(v) => prefsService.set('app.vwData', v)}
      />
      <RowCheck
        label={t.appconnect.set.mirrorlinkHints}
        checked={prefs['app.mirrorlinkHints']}
        onChange={(v) => prefsService.set('app.mirrorlinkHints', v)}
      />
    </ScrollList>
  )
}

/**
 * App-Connect (fabricki: taster APP). Projekcija telefona nije dostupna na
 * ovom uredjaju — izbor tehnologije prikazuje fabricke uslove i jasno stanje.
 */
export function AppConnectScreen() {
  const { path, push } = useNavigation()
  const { t } = useT()
  const [tech, setTech] = useState<Tech | null>(null)
  const [info, setInfo] = useState(false)

  if (path[0] === 'settings') {
    return (
      <div className="flex h-full flex-col">
        <AppConnectSettings />
      </div>
    )
  }

  const reqs: Record<Tech, string[]> = {
    carplay: t.appconnect.carplayReq,
    androidAuto: t.appconnect.androidAutoReq,
    mirrorlink: t.appconnect.mirrorlinkReq,
  }

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <TitleActions>
        <TitleButton onClick={() => setInfo(true)} aria-label={t.appconnect.info}>
          <Icon name="info" size={20} />
        </TitleButton>
        <TitleButton onClick={() => push('settings')} aria-label={t.common.settings}>
          <Icon name="settings" size={20} />
        </TitleButton>
      </TitleActions>

      <MenuIcon name="appconnect" size={96} />
      <p className="mt-4 text-title text-text-2">{t.appconnect.connectHint}</p>

      <div className="mt-10 flex gap-10">
        {(['carplay', 'androidAuto', 'mirrorlink'] as Tech[]).map((id) => (
          <motion.button
            key={id}
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.08 }}
            onClick={() => setTech(id)}
            className="flex w-[260px] flex-col items-center gap-3"
          >
            <span className="card flex h-[150px] w-full flex-col items-center justify-center gap-3">
              <Icon name={TECH_ICON[id]} size={46} strokeWidth={1.4} />
              <span className="text-micro font-semibold tracking-[0.14em] text-text-3 uppercase">
                {t.common.notConnected}
              </span>
            </span>
            <span className="text-[21px] leading-none font-medium">{t.appconnect[id]}</span>
          </motion.button>
        ))}
      </div>

      <Dialog
        open={tech !== null}
        title={tech ? t.appconnect[tech] : ''}
        onClose={() => setTech(null)}
        width={640}
        actions={
          <OemButton className="flex-1" active onClick={() => setTech(null)}>
            {t.common.ok}
          </OemButton>
        }
      >
        {tech && (
          <div className="px-5 py-4">
            <p className="text-small font-medium text-text-3">{t.appconnect.requirements}</p>
            <ul className="mt-2 space-y-2">
              {reqs[tech].map((r) => (
                <li key={r} className="flex items-start gap-3 text-body">
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center border-2 border-line-strong" />
                  {r}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line-soft pt-4 text-small leading-relaxed text-text-3">
              {t.appconnect.notAvailable}
            </p>
          </div>
        )}
      </Dialog>

      <Dialog open={info} title={t.appconnect.info} onClose={() => setInfo(false)}>
        <ListNote>{t.appconnect.infoText}</ListNote>
      </Dialog>
    </div>
  )
}
