type IconName =
  | 'user'
  | 'shop'
  | 'star'
  | 'search'
  | 'chat'
  | 'trophy'
  | 'check'
  | 'trash'
  | 'close'
  | 'wallet'
  | 'pin'
  | 'recenter'
  | 'camera'
  | 'list'
  | 'route'
  | 'back'
  | 'refresh'

const PATHS: Record<IconName, string> = {
  user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z',
  shop: 'M4 4h16l1 5v2h-2v9h-5v-6h-4v6H5v-9H3V9l1-5Zm2 2-.6 3h13.2L18 6H6Zm1 5v7h1v-6h8v6h1v-7H7Z',
  star: 'm12 2 2.9 6.26 6.85.83-5.05 4.7 1.33 6.74L12 17.18 5.97 20.53 7.3 13.8 2.25 9.1l6.85-.83L12 2Z',
  search: 'M10 4a6 6 0 1 0 3.66 10.75l4.3 4.3 1.42-1.42-4.3-4.3A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
  chat: 'M4 5h16v11H7.5L4 19.5V5Zm2 2v7.67L6.67 14H18V7H6Z',
  trophy: 'M7 4h10v2h3v3a5 5 0 0 1-4.2 4.93A6.03 6.03 0 0 1 13 16.92V19h3v2H8v-2h3v-2.08a6.03 6.03 0 0 1-2.8-2.99A5 5 0 0 1 4 9V6h3V4Zm0 4H6v1a3 3 0 0 0 1.24 2.43A6.2 6.2 0 0 1 7 10V8Zm10 0v2c0 .49-.06.97-.17 1.43A3 3 0 0 0 18 9V8h-1Zm-8-2v4a3 3 0 0 0 6 0V6H9Z',
  check: 'm9.2 16.6-4.1-4.1-1.4 1.4 5.5 5.5L21 7.6l-1.4-1.4L9.2 16.6Z',
  trash: 'M8 4h8l1 2h4v2H3V6h4l1-2Zm-2 6h12l-1 10H7L6 10Zm3 2v6h2v-6H9Zm4 0v6h2v-6h-2Z',
  close: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
  wallet: 'M4 5h16v4h-2V7H6v10h12v-2h2v4H4V5Zm9 5h8v5h-8v-5Zm2 2v1h2v-1h-2Z',
  pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z',
  recenter: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 3h-2.07A7.005 7.005 0 0 0 13 5.07V3h-2v2.07A7.005 7.005 0 0 0 5.07 11H3v2h2.07A7.005 7.005 0 0 0 11 18.93V21h2v-2.07A7.005 7.005 0 0 0 18.93 13H21v-2Zm-9 6a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z',
  camera: 'M9 4h6l1.2 2H20v14H4V6h3.8L9 4Zm3 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z',
  list: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z',
  route: 'M6 5a3 3 0 0 1 6 0c0 2.25-3 5-3 5S6 7.25 6 5Zm7 14a3 3 0 1 0 6 0c0-2.25-3-5-3-5s-3 2.75-3 5ZM9 13h6a2 2 0 0 1 0 4H8a1 1 0 0 0 0 2h3v2H8a3 3 0 0 1 0-6h7a1 1 0 0 0 0-2H9v-2Z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z',
  refresh: 'M17.65 6.35A8 8 0 1 0 19.73 14h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z',
}

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d={PATHS[name]} />
    </svg>
  )
}
