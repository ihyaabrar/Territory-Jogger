/**
 * Custom SVG Icon Library — Territory Jogger
 * Semua icon dibuat dari scratch, gaya clean geometric
 * Warna tema: Red Rose #C0392B
 * strokeWidth default: 2 (lebih tebal = lebih readable di mobile)
 */

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

const sw = 2 // default stroke width — lebih tebal untuk mobile

// ─── Home / Summary ──────────────────────────────────────────────────────────
export function IconHome({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 12L12 4L21 12V20C21 20.55 20.55 21 20 21H15V16H9V21H4C3.45 21 3 20.55 3 20V12Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Map / Activity ──────────────────────────────────────────────────────────
export function IconMap({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 7L9 4L15 7L21 4V17L15 20L9 17L3 20V7Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="9" y1="4" x2="9" y2="17" stroke={color} strokeWidth={strokeWidth * 0.6} strokeLinecap="round" opacity="0.5"/>
      <line x1="15" y1="7" x2="15" y2="20" stroke={color} strokeWidth={strokeWidth * 0.6} strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// ─── History / Clock ─────────────────────────────────────────────────────────
export function IconHistory({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M12 7V12.5L16 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Trophy / Leaderboard ────────────────────────────────────────────────────
export function IconTrophy({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 3H16V13C16 15.21 14.21 17 12 17C9.79 17 8 15.21 8 13V3Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 6H5C5 6 4 6.5 4 8.5C4 10.5 5.5 11.5 8 11"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M16 6H19C19 6 20 6.5 20 8.5C20 10.5 18.5 11.5 16 11"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M12 17V20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M9 20H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── User / Profile ──────────────────────────────────────────────────────────
export function IconUser({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M4 20C4 17 7.58 15 12 15C16.42 15 20 17 20 20"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Bell / Notifications ────────────────────────────────────────────────────
export function IconBell({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 10C6 7 8.69 5 12 5C15.31 5 18 7 18 10V16H6V10Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 16H20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M12 3V5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Crosshair / My Location ─────────────────────────────────────────────────
export function IconCrosshair({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth={strokeWidth}/>
      <line x1="12" y1="2" x2="12" y2="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12" y2="22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <line x1="2" y1="12" x2="7" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <line x1="17" y1="12" x2="22" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" fill={color}/>
    </svg>
  )
}

// ─── Compass ─────────────────────────────────────────────────────────────────
export function IconCompass({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M16.24 7.76L13.41 13.41L7.76 16.24L10.59 10.59L16.24 7.76Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="1.5" fill={color}/>
    </svg>
  )
}

// ─── Zoom In ─────────────────────────────────────────────────────────────────
export function IconZoomIn({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M21 21L16.65 16.65" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M8 11H14M11 8V14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Zoom Out ────────────────────────────────────────────────────────────────
export function IconZoomOut({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M21 21L16.65 16.65" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M8 11H14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Territory / Flag ────────────────────────────────────────────────────────
export function IconTerritory({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 3V21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M5 5H19L15 10L19 15H5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Fire / Calories ─────────────────────────────────────────────────────────
export function IconFire({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 7 8 7 13C7 16.31 9.24 19 12 19C14.76 19 17 16.31 17 13C17 10 15 8 15 8C15 8 14 11 12 11C10 11 10 9 10 9C10 9 12 6 12 2Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 19C12 20.1 12.9 21 14 21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// ─── Route / Distance ────────────────────────────────────────────────────────
export function IconRoute({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="6" r="2" stroke={color} strokeWidth={strokeWidth}/>
      <circle cx="19" cy="18" r="2" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M5 8C5 8 5 12 9 12H15C19 12 19 16 19 16"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Clock ───────────────────────────────────────────────────────────────────
export function IconClock({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M12 7V12.5L15.5 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Pin / Location ──────────────────────────────────────────────────────────
export function IconPin({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.69 2 6 4.69 6 8C6 12.5 12 22 12 22C12 22 18 12.5 18 8C18 4.69 15.31 2 12 2Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="8" r="2.5" stroke={color} strokeWidth={strokeWidth}/>
    </svg>
  )
}

// ─── Lock / Privacy ──────────────────────────────────────────────────────────
export function IconLock({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill={color}/>
    </svg>
  )
}

// ─── Settings / Gear ─────────────────────────────────────────────────────────
export function IconSettings({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Sword / Invasion ────────────────────────────────────────────────────────
export function IconSword({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 17.5L3 6V3H6L17.5 14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 19L19 13L21 15L15 21L13 19Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 21L7 17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Chevron Right ───────────────────────────────────────────────────────────
export function IconChevronRight({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 18L15 12L9 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Play ────────────────────────────────────────────────────────────────────
export function IconPlay({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 4L20 12L6 20V4Z" fill={color}/>
    </svg>
  )
}

// ─── Stop ────────────────────────────────────────────────────────────────────
export function IconStop({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="5" width="14" height="14" rx="2" fill={color}/>
    </svg>
  )
}

// ─── Layers ──────────────────────────────────────────────────────────────────
export function IconLayers({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L22 8L12 14L2 8L12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 18L22 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 16L12 22L22 16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Runner Illustration ─────────────────────────────────────────────────────
// Pictogram lari yang clean — menggunakan path yang sudah teruji
// Gaya: stick figure atletik dengan proporsi yang benar
export function RunnerIllustration({ size = 40, color = '#C0392B' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Kepala */}
      <circle cx="17" cy="3.5" r="2" fill={color}/>
      {/* Badan condong ke depan */}
      <path d="M15.5 5.5L13 10" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      {/* Lengan kiri ke depan */}
      <path d="M14.5 7L11 9.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      {/* Lengan kanan ke belakang */}
      <path d="M14.5 7L18 5.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      {/* Paha kiri ke depan */}
      <path d="M13 10L10.5 14" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      {/* Betis kiri — ditekuk ke belakang */}
      <path d="M10.5 14L12 17.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      {/* Paha kanan ke belakang */}
      <path d="M13 10L15.5 13.5" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      {/* Betis kanan — ditekuk ke depan */}
      <path d="M15.5 13.5L13.5 17" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── IconRun — alias RunnerIllustration untuk nav ────────────────────────────
export function IconRun({ size = 24, color = 'currentColor' }: IconProps) {
  return <RunnerIllustration size={size} color={color} />
}
