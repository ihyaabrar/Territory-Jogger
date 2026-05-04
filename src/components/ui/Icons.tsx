/**
 * Custom SVG Icon Library — Territory Jogger
 * Semua icon dibuat dari scratch, tidak pakai emoji
 */

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

const defaults = { size: 24, color: 'currentColor', strokeWidth: 1.8 }

// ─── Home / Dashboard ────────────────────────────────────────────────────────
export function IconHome({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Map / Explore ───────────────────────────────────────────────────────────
export function IconMap({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3L3 6V21L9 18L15 21L21 18V3L15 6L9 3Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 3V18M15 6V21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Record / Run (center FAB) ───────────────────────────────────────────────
export function IconRun({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Running figure */}
      <circle cx="14" cy="4.5" r="1.8" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M12 7.5L9.5 12L6 13.5M12 7.5L15 10L18 9M12 7.5L13 13L11 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      {/* Speed lines */}
      <path d="M4 10H7M3 13H6M4 16H7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// ─── Trophy / Leaderboard ────────────────────────────────────────────────────
export function IconTrophy({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 3H16V13C16 15.21 14.21 17 12 17C9.79 17 8 15.21 8 13V3Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 6H5C5 6 4 6 4 8C4 10 5.5 11 8 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M16 6H19C19 6 20 6 20 8C20 10 18.5 11 16 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M12 17V20M9 20H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Bell / Notifications ────────────────────────────────────────────────────
export function IconBell({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 10C6 7.24 8.24 5 11 5H13C15.76 5 18 7.24 18 10V16H6V10Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 16H20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M12 3V5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── User / Profile ──────────────────────────────────────────────────────────
export function IconUser({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M4 20C4 17.24 7.58 15 12 15C16.42 15 20 17.24 20 20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Territory / Flag ────────────────────────────────────────────────────────
export function IconTerritory({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3V21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M5 4L19 4L15 9L19 14L5 14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Fire / Calories ─────────────────────────────────────────────────────────
export function IconFire({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 7 7 7 13C7 16.31 9.24 19 12 19C14.76 19 17 16.31 17 13C17 10 15 8 15 8C15 8 14 11 12 11C10 11 10 9 10 9C10 9 12 7 12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 19C12 20.1 12.9 21 14 21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// ─── Distance / Route ────────────────────────────────────────────────────────
export function IconRoute({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="6" r="2" stroke={color} strokeWidth={strokeWidth}/>
      <circle cx="19" cy="18" r="2" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M5 8C5 8 5 12 9 12H15C19 12 19 16 19 16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Clock / Duration ────────────────────────────────────────────────────────
export function IconClock({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M12 7V12L15 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Location Pin ────────────────────────────────────────────────────────────
export function IconPin({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.69 2 6 4.69 6 8C6 12.5 12 21 12 21C12 21 18 12.5 18 8C18 4.69 15.31 2 12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="8" r="2.5" stroke={color} strokeWidth={strokeWidth}/>
    </svg>
  )
}

// ─── Compass ─────────────────────────────────────────────────────────────────
export function IconCompass({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M16.24 7.76L13.41 13.41L7.76 16.24L10.59 10.59L16.24 7.76Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="1" fill={color}/>
    </svg>
  )
}

// ─── Lock / Privacy ──────────────────────────────────────────────────────────
export function IconLock({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill={color}/>
    </svg>
  )
}

// ─── Settings / Gear ─────────────────────────────────────────────────────────
export function IconSettings({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Sword / Invasion ────────────────────────────────────────────────────────
export function IconSword({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.5 17.5L3 6V3H6L17.5 14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 19L19 13L21 15L15 21L13 19Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 21L7 17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Chevron Right ───────────────────────────────────────────────────────────
export function IconChevronRight({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18L15 12L9 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Play ────────────────────────────────────────────────────────────────────
export function IconPlay({ size = defaults.size, color = defaults.color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4L20 12L6 20V4Z" fill={color}/>
    </svg>
  )
}

// ─── Stop ────────────────────────────────────────────────────────────────────
export function IconStop({ size = defaults.size, color = defaults.color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="14" height="14" rx="2" fill={color}/>
    </svg>
  )
}

// ─── Crosshair / My Location ─────────────────────────────────────────────────
export function IconCrosshair({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <circle cx="12" cy="12" r="1.5" fill={color}/>
    </svg>
  )
}

// ─── Layers / Territory Map ──────────────────────────────────────────────────
export function IconLayers({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L22 8L12 14L2 8L12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 18L22 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 16L12 22L22 16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Zoom In ─────────────────────────────────────────────────────────────────
export function IconZoomIn({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M21 21L16.65 16.65" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M8 11H14M11 8V14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Zoom Out ────────────────────────────────────────────────────────────────
export function IconZoomOut({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M21 21L16.65 16.65" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M8 11H14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}
