import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const SCREEN_W = 1280
const SCREEN_H = 720

/**
 * Drzi interfejs na fiksnoj rezoluciji namenskog ekrana (1280x720) i skalira ga
 * da stane u prozor. Na racunaru dobijas vernu sliku uredjaja, a na uredjaju
 * skaliranje je 1:1, pa se layout ne menja.
 */
export function Viewport({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const fit = () => {
      const s = Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H)
      setScale(s)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <div
        style={{
          width: SCREEN_W,
          height: SCREEN_H,
          transform: 'scale(' + scale + ')',
          transformOrigin: 'center',
          background: 'var(--app-bg)',
        }}
        className="relative overflow-hidden"
      >
        {children}
      </div>
    </div>
  )
}
