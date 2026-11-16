import { motion } from 'framer-motion'
import type { BootLogoId } from '@/app/settings'

export const BOOT_LOGOS: Record<BootLogoId, { src: string; label: string; hint: string }> = {
  '2012': {
    src: '/assets/volkswagen-logo.png',
    label: 'Hromirani znak',
    hint: 'Period mog Golfa (2012-2019)',
  },
  '2019': {
    src: '/assets/Volkswagen_logo_2019.svg.webp',
    label: 'Ravni znak',
    hint: 'Novija generacija (od 2019)',
  },
}

/**
 * Znak na uvodnom ekranu.
 *
 * Hromirani znak dolazi kao slika na crnoj podlozi, pa se stapa sa crnim
 * ekranom. Ravni znak ima providnu pozadinu i tamnoplavu boju, pa se CSS
 * filterom prevodi u belo da bi bio citljiv na crnom.
 */
export function VwBootLogo({
  variant,
  size = 230,
  glow = true,
}: {
  variant: BootLogoId
  size?: number
  glow?: boolean
}) {
  const flat = variant === '2019'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Difuzan sjaj iza znaka */}
      {glow && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 0.55, 0.3], scale: [0.7, 1.15, 1.05] }}
          transition={{ duration: 2.2, times: [0, 0.55, 1], ease: 'easeOut' }}
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--accent) 55%, transparent) 0%, transparent 65%)',
            filter: 'blur(26px)',
          }}
        />
      )}

      <div className="relative size-full">
        <img
          src={BOOT_LOGOS[variant].src}
          alt="Volkswagen"
          draggable={false}
          className={'size-full object-contain ' + (flat ? 'p-[6%]' : '')}
          style={
            flat
              ? { filter: 'brightness(0) invert(1) drop-shadow(0 0 22px #ffffff40)' }
              : undefined
          }
        />
      </div>
    </motion.div>
  )
}
