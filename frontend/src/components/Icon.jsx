const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 7v5l3 2',
  fork: 'M5 3v5a2 2 0 0 0 4 0V3 M7 10v11 M17 21V3c-2.2 1.2-3.5 3.8-3.5 7.5H17',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z M12 8a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
  question: 'M9.2 9a2.8 2.8 0 1 1 3.9 2.6c-.7.3-1.1 1-1.1 1.7v.7 M12 17.6v.4',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5 11a7 7 0 0 0 14 0 M12 18v3',
  keys: 'M3 6h18v12H3z M7 10h.01 M11 10h.01 M15 10h.01 M7 14h10',
  brain: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 3v5 M12 16v5 M3 12h5 M16 12h5',
  vault: 'M4 5h16v13H4z M12 8.5a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M7 18v2 M17 18v2',
  magnet: 'M6 3v8a6 6 0 0 0 12 0V3 M6 3h4v8a2 2 0 0 0 4 0V3h4 M6 7h4 M14 7h4',
  close: 'M6 6l12 12 M18 6L6 18',
  down: 'M12 5v14 M6 13l6 6 6-6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  bank: 'M3 10l9-6 9 6 M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 21h18',
  alert: 'M12 4l9 16H3z M12 10v4 M12 17.5v.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  speaker: 'M4 9h4l5-4v14l-5-4H4z M16.5 9a4 4 0 0 1 0 6 M19.5 6.5a8 8 0 0 1 0 11',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  note: 'M6 3h9l3 3v15H6z M9 9h6 M9 13h6 M9 17h4',
  chat: 'M4 5h16v11H9l-5 4z',
  plus: 'M12 5v14 M5 12h14',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
}

export default function Icon({ name, size = 22, sw = 2.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}
