import type { CSSProperties } from 'react'
/**
 * Minimalan set linijskih ikonica u VW maniru — bez dodatne biblioteke.
 * Sve koriste currentColor i stroke 1.6, pa deluju kao jedna familija.
 */
export type IconName =
  | 'home'
  | 'music'
  | 'map'
  | 'car'
  | 'settings'
  | 'play'
  | 'pause'
  | 'next'
  | 'prev'
  | 'shuffle'
  | 'repeat'
  | 'repeat-one'
  | 'volume'
  | 'volume-off'
  | 'bluetooth'
  | 'wifi'
  | 'signal'
  | 'phone'
  | 'plus'
  | 'minus'
  | 'sun'
  | 'moon'
  | 'thermometer'
  | 'fuel'
  | 'chevron-right'
  | 'cloud'
  | 'list'
  | 'power'
  | 'door'
  | 'headlight'
  | 'fan'
  | 'gauge'
  | 'search'
  | 'radio'
  | 'check'
  | 'warning'
  | 'chevron-left'
  | 'navigate'
  | 'devices'
  | 'user'
  | 'equalizer'
  | 'grid'
  | 'keypad'
  | 'star'
  | 'trash'
  | 'edit'
  | 'usb'
  | 'clock'
  | 'wrench'
  | 'route'
  | 'close'
  | 'more'
  | 'folder'
  | 'folder-up'
  | 'scan'
  | 'message'
  | 'call-end'
  | 'backspace'
  | 'info'
  | 'eject'
  | 'refresh'
  | 'chevron-down'
  | 'chevron-up'
  | 'image'
  | 'snowflake'
  | 'camera'
  | 'parking'
  | 'sensors'
  | 'link'
  | 'recirc'
  | 'defrost'
  | 'rear-defrost'
  | 'seat'
  | 'arrow-up'
  | 'auto'
  | 'fast-forward'
  | 'rewind'
  | 'phone-list'
  | 'contacts'

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  music: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  car: 'M4 16v-3l2-5h12l2 5v3M4 16h16M4 16v2h3v-2m13 0v2h-3v-2M7.5 13h9',
  settings:
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8-3.2-1.8-.5-.6-1.5 1-1.6-1.5-1.5-1.6 1-1.5-.6L13.5 4h-3l-.5 1.8-1.5.6-1.6-1L5.4 6.9l1 1.6-.6 1.5L4 12l1.8.5.6 1.5-1 1.6 1.5 1.5 1.6-1 1.5.6.5 1.8h3l.5-1.8 1.5-.6 1.6 1 1.5-1.5-1-1.6.6-1.5L20 12Z',
  play: 'M8 5.5v13l11-6.5-11-6.5Z',
  pause: 'M9 5.5v13M15 5.5v13',
  next: 'M6 5.5v13l9-6.5-9-6.5ZM18 5.5v13',
  prev: 'M18 5.5v13L9 12l9-6.5ZM6 5.5v13',
  shuffle: 'M16 4h4v4M20 4l-6.5 6.5M4 20l6-6M16 20h4v-4M14 14l6 6M4 4l4.5 4.5',
  repeat: 'M7 7h10l-2.5-2.5M17 17H7l2.5 2.5M17 7v4M7 17v-4',
  'repeat-one': 'M7 7h10l-2.5-2.5M17 17H7l2.5 2.5M12 10.5h1V14',
  volume: 'M4 9.5h3L12 6v12L7 14.5H4v-5Zm12-2a6 6 0 0 1 0 9m-2.5-6.5a2.5 2.5 0 0 1 0 4',
  'volume-off': 'M4 9.5h3L12 6v12L7 14.5H4v-5ZM16 9.5l5 5m0-5-5 5',
  bluetooth: 'M8 7.5 16 16.5 12 20V4l4 3.5L8 16.5',
  wifi: 'M3.5 9a13 13 0 0 1 17 0M6.5 12.5a8.6 8.6 0 0 1 11 0M9.5 16a4.4 4.4 0 0 1 5 0M12 19.2h.01',
  signal: 'M4 20V16M9.3 20V12M14.6 20V8M20 20V4',
  phone:
    'M6 4h3l1.5 4-2 1.5a10 10 0 0 0 5 5L15 12.5 19 14v3a2 2 0 0 1-2.2 2A14.5 14.5 0 0 1 5 6.2 2 2 0 0 1 6 4Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',
  thermometer: 'M12 14.8V5a2 2 0 0 1 4 0v9.8a4 4 0 1 1-4 0ZM14 18h.01',
  fuel: 'M5 20V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15M4 20h10M13 9h3l2 2v6a2 2 0 0 0 2-2V9l-2.5-3M7 8h4',
  'chevron-right': 'M9.5 6l6 6-6 6',
  cloud: 'M7 18h10a3.5 3.5 0 0 0 .3-7 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18Z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  power: 'M12 3v9M6.8 6.8a8 8 0 1 0 10.4 0',
  door: 'M5 20V6l9-2v16H5Zm0 0h11M11.5 12.5h.01',
  headlight:
    'M4 7h6a7 7 0 0 1 0 10H4V7Zm14 1.5h3M18 12h4M18 15.5h3',
  fan: 'M12 12a3 3 0 0 0 3-3V4a5 5 0 0 0-3 8Zm0 0a3 3 0 0 0-3 3v5a5 5 0 0 0 3-8Zm0 0a3 3 0 0 0 3 3h5a5 5 0 0 0-8-3Zm0 0a3 3 0 0 0-3-3H4a5 5 0 0 0 8 3Z',
  gauge: 'M4.5 18a9 9 0 1 1 15 0M12 13.5 16 9',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.2-1.8L21 21',
  radio: 'M4 9h16v10H4V9Zm0 0 13-5M8 14h.01M16 11v6M11 14h2',
  check: 'M4.5 12.5 10 18 20 6',
  warning: 'M12 4 2.5 20h19L12 4Zm0 6v5m0 3h.01',
  'chevron-left': 'M14.5 6l-6 6 6 6',
  navigate: 'M20.5 3.5 3.5 10.5l7.2 2.8 2.8 7.2 7-17Z',
  devices: 'M3 6h11v9H3V6Zm0 9v2h8M17 9h4v10h-4V9Zm1.8 7.6h.4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8a8 8 0 0 1 16 0',
  equalizer: 'M6 20V4m6 16V4m6 16V4M3.5 9h5m.5 6h5m.5-9h5',
  grid: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  keypad: 'M7 6h.01M12 6h.01M17 6h.01M7 11h.01M12 11h.01M17 11h.01M7 16h.01M12 16h.01M17 16h.01M12 21h.01',
  star: 'm12 4 2.5 5.2 5.5.8-4 4 1 5.6-5-2.8-5 2.8 1-5.6-4-4 5.5-.8L12 4Z',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5m4-5v5',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm10.5-13.5 3 3',
  usb: 'M12 20V5m0 0-3 3m3-3 3 3M8.5 12.5 12 15l3.5-2.5M7 11a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm7 0h3v3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3.5 2',
  wrench: 'M15.5 4a5 5 0 0 0-4.3 7.6L4 18.8 6.2 21l7.2-7.2A5 5 0 1 0 15.5 4Z',
  route: 'M6.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm11 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0-5V12a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 5 12v6.5',
  'close': 'M6 6l12 12M18 6 6 18',
  'more': 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  'folder': 'M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7.5Z',
  'folder-up': 'M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7.5ZM12 16v-5m-2.5 2.2L12 10.8l2.5 2.4',
  'scan': 'M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8.2 15.8a5.4 5.4 0 0 1 0-7.6m7.6 0a5.4 5.4 0 0 1 0 7.6M5.4 18.6a9.4 9.4 0 0 1 0-13.2m13.2 0a9.4 9.4 0 0 1 0 13.2',
  'message': 'M4 5.5h16v11H9l-5 3.5v-14.5Z',
  'call-end': 'M3.5 14.5c4.7-4.6 12.3-4.6 17 0l-2.2 2.4-3.3-1.2-.3-2.4a10 10 0 0 0-5.4 0l-.3 2.4-3.3 1.2-2.2-2.4Z',
  'backspace': 'M9 5.5h11v13H9l-6-6.5 6-6.5Zm3 3.8 5 5m0-5-5 5',
  'info': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9h.01',
  'eject': 'M12 5l7 8H5l7-8Zm-7 12h14',
  'refresh': 'M19.5 8A8 8 0 0 0 5 9.5M4.5 16A8 8 0 0 0 19 14.5M19.5 4v4h-4M4.5 20v-4h4',
  'chevron-down': 'M6 9.5l6 6 6-6',
  'chevron-up': 'M6 14.5l6-6 6 6',
  'image': 'M4 5h16v14H4V5Zm0 11 4.5-4.5L12 15l3-3 5 5M15.5 9.5h.01',
  'snowflake': 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5',
  'camera': 'M3 8h3.5L8 5.5h8L17.5 8H21v11H3V8Zm9 2.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  'parking': 'M4 4h16v16H4V4Zm5.5 12V8h3.5a2.5 2.5 0 0 1 0 5H9.5',
  'sensors': 'M8 9h8v11H8V9Zm-2-2.5a8.5 8.5 0 0 1 12 0M3.5 4a12 12 0 0 1 17 0',
  'link': 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  'recirc': 'M5 15.5c0-4 3-7 7-7h5m0 0-3-3m3 3-3 3M6 18.5h12',
  'defrost': 'M5 9c2-1.3 4-1.3 6 0s4 1.3 6 0m-12 4c2-1.3 4-1.3 6 0s4 1.3 6 0M4 5.5c5-3 11-3 16 0M8 16.5l-1 3m5-3v3m4-3 1 3',
  'rear-defrost': 'M4 5.5h16v9H4v-9Zm3 3h10m-10 3h10M8 17.5l-1 2.5m5-2.5V20m4-2.5 1 2.5',
  'seat': 'M9 3.5h3l1 8h5l1.5 6.5H8l-1-6L9 3.5ZM7.5 20.5h12',
  'arrow-up': 'M12 19V5m-6 6 6-6 6 6',
  'auto': 'M4 18 9 6h.5l5 12M6 14h7M15 6h5',
  'fast-forward': 'M4 6v12l8-6-8-6Zm8 0v12l8-6-8-6Z',
  'rewind': 'M20 6v12l-8-6 8-6Zm-8 0v12l-8-6 8-6Z',
  'phone-list': 'M6 4h3l1.5 4-2 1.5a10 10 0 0 0 5 5L15 12.5 19 14v3a2 2 0 0 1-2.2 2A14.5 14.5 0 0 1 5 6.2 2 2 0 0 1 6 4ZM15 4h5m-5 3.5h5',
  'contacts': 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6.5 9a6.5 6.5 0 0 1 13 0M3.5 7v4M20.5 7v4',
}

const FILLED: IconName[] = ['play', 'next', 'prev', 'fast-forward', 'rewind', 'eject']

export function Icon({
  name,
  size = 24,
  className = '',
  strokeWidth = 1.6,
  style,
}: {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
  style?: CSSProperties
}) {
  const filled = FILLED.includes(name)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d={PATHS[name]}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}
