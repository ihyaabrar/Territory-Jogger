/**
 * Custom SVG Icon Library — Territory Jogger
 * Semua icon dibuat dari scratch dengan gaya geometric/bold
 * Warna tema: Red Rose #C0392B
 */

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

const sw = 1.9 // default stroke width

// ─── Summary / Home ──────────────────────────────────────────────────────────
// Ikon rumah dengan atap segitiga dan pintu
export function IconHome({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Atap */}
      <path d="M2 11L12 3L22 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      {/* Dinding kiri */}
      <path d="M4 10V20C4 20.55 4.45 21 5 21H9V16H15V21H19C19.55 21 20 20.55 20 20V10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      {/* Tiang tengah */}
      <path d="M12 3V6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.4"/>
    </svg>
  )
}

// ─── Activity / Map ──────────────────────────────────────────────────────────
// Ikon peta lipat dengan garis jalur
export function IconMap({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Peta lipat */}
      <path d="M3 6L9 4L15 7L21 5V19L15 21L9 18L3 20V6Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      {/* Lipatan vertikal */}
      <line x1="9" y1="4" x2="9" y2="18" stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" opacity="0.5"/>
      <line x1="15" y1="7" x2="15" y2="21" stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// ─── Riwayat / History ───────────────────────────────────────────────────────
// Ikon jam dengan panah memutar (history)
export function IconHistory({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Lingkaran jam */}
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={strokeWidth}/>
      {/* Jarum jam */}
      <path d="M12 7.5V12.5L15.5 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      {/* Panah balik kecil di kiri atas */}
      <path d="M4.5 4.5L3 7.5L6.5 7" stroke={color} strokeWidth={strokeWidth * 0.85} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Peringkat / Trophy ──────────────────────────────────────────────────────
// Ikon piala dengan bintang
export function IconTrophy({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Badan piala */}
      <path d="M7 3H17V12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12V3Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      {/* Telinga kiri */}
      <path d="M7 6H4.5C4.5 6 3 6.5 3 8.5C3 10.5 5 11.5 7 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      {/* Telinga kanan */}
      <path d="M17 6H19.5C19.5 6 21 6.5 21 8.5C21 10.5 19 11.5 17 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      {/* Kaki piala */}
      <path d="M12 17V20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M8.5 20H15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      {/* Bintang kecil di dalam */}
      <path d="M12 7L12.7 9H15L13.2 10.2L13.9 12.2L12 11L10.1 12.2L10.8 10.2L9 9H11.3L12 7Z" fill={color} opacity="0.35"/>
    </svg>
  )
}

// ─── Settings / Profile ──────────────────────────────────────────────────────
// Ikon orang dengan lingkaran kepala dan bahu
export function IconUser({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Kepala */}
      <circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth={strokeWidth}/>
      {/* Bahu / badan */}
      <path d="M4.5 20.5C4.5 17.46 7.91 15 12 15C16.09 15 19.5 17.46 19.5 20.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Bell / Notifikasi ───────────────────────────────────────────────────────
export function IconBell({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Lonceng */}
      <path d="M5.5 10C5.5 7 8.5 4.5 12 4.5C15.5 4.5 18.5 7 18.5 10V16.5H5.5V10Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      {/* Garis bawah */}
      <path d="M3.5 16.5H20.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      {/* Kait atas */}
      <path d="M12 3V4.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      {/* Klapper bawah */}
      <path d="M10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Crosshair / Lokasi ──────────────────────────────────────────────────────
// Ikon target dengan titik tengah
export function IconCrosshair({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Lingkaran luar */}
      <circle cx="12" cy="12" r="7" stroke={color} strokeWidth={strokeWidth}/>
      {/* Garis silang */}
      <line x1="12" y1="2" x2="12" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <line x1="2" y1="12" x2="6" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <line x1="18" y1="12" x2="22" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      {/* Titik tengah */}
      <circle cx="12" cy="12" r="2" fill={color}/>
    </svg>
  )
}

// ─── Compass ─────────────────────────────────────────────────────────────────
// Kompas dengan jarum N-S
export function IconCompass({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Lingkaran */}
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth}/>
      {/* Jarum utara (merah) */}
      <path d="M12 12L9 7L12 9L15 7L12 12Z" fill={color} opacity="0.9"/>
      {/* Jarum selatan */}
      <path d="M12 12L9 17L12 15L15 17L12 12Z" fill={color} opacity="0.3"/>
      {/* Titik tengah */}
      <circle cx="12" cy="12" r="1.2" fill={color}/>
    </svg>
  )
}

// ─── Zoom In ─────────────────────────────────────────────────────────────────
export function IconZoomIn({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M20 20L15.5 15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M7.5 10.5H13.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M10.5 7.5V13.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Zoom Out ────────────────────────────────────────────────────────────────
export function IconZoomOut({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M20 20L15.5 15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M7.5 10.5H13.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

// ─── Territory / Flag ────────────────────────────────────────────────────────
export function IconTerritory({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 3V21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M5 4.5L19 4.5L15 9.5L19 14.5L5 14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Fire / Kalori ───────────────────────────────────────────────────────────
export function IconFire({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 7 7.5 7 13C7 16.31 9.24 19 12 19C14.76 19 17 16.31 17 13C17 10.5 15.5 9 15.5 9C15.5 9 14.5 11.5 12.5 11.5C10.5 11.5 10 9.5 10 9.5C10 9.5 12 7 12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 19C12 20.1 12.9 21 14 21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.4"/>
    </svg>
  )
}

// ─── Route / Jarak ───────────────────────────────────────────────────────────
export function IconRoute({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="6" r="2.2" stroke={color} strokeWidth={strokeWidth}/>
      <circle cx="19" cy="18" r="2.2" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M5 8.2C5 8.2 5 12 9 12H15C19 12 19 15.8 19 15.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
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

// ─── Pin / Lokasi ────────────────────────────────────────────────────────────
export function IconPin({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.5 2 5.5 4.9 5.5 8.5C5.5 13.5 12 22 12 22C12 22 18.5 13.5 18.5 8.5C18.5 4.9 15.5 2 12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="8.5" r="2.5" stroke={color} strokeWidth={strokeWidth}/>
    </svg>
  )
}

// ─── Lock / Privacy ──────────────────────────────────────────────────────────
export function IconLock({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2.5" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M8 11V7.5C8 5.57 9.79 4 12 4C14.21 4 16 5.57 16 7.5V11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1.8" fill={color}/>
    </svg>
  )
}

// ─── Settings / Gear ─────────────────────────────────────────────────────────
export function IconSettings({ size = 24, color = 'currentColor', strokeWidth = sw }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth}/>
      <path d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
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

// ─── Stop / Pause ────────────────────────────────────────────────────────────
export function IconStop({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="5" width="14" height="14" rx="2.5" fill={color}/>
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

// ─── Record / Run (nav icon) — digantikan oleh IconRun di bawah ─────────────

// ─── Runner SVG — Pictogram atletik solid (filled, bukan stroke) ─────────────
// Meniru gaya Olympic/athletics pictogram: semua bagian tubuh filled solid
export function RunnerIllustration({ size = 40, color = '#C0392B' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      {/* Kepala */}
      <circle cx="44" cy="8" r="6" fill={color}/>
      {/* Badan + paha kiri (condong ke depan) */}
      <path d="M40 14 C36 16 30 22 26 32 L32 34 C35 26 39 21 42 18 Z" fill={color}/>
      {/* Lengan kanan ke belakang-atas */}
      <path d="M40 18 C42 16 50 12 54 10 C55 13 53 15 51 16 C48 17 44 20 42 22 Z" fill={color}/>
      {/* Lengan kiri ke depan-bawah */}
      <path d="M36 22 C32 26 24 30 20 32 C19 29 21 27 23 26 C27 24 32 20 34 18 Z" fill={color}/>
      {/* Kaki kiri — ditekuk ke depan, lutut terangkat */}
      <path d="M26 32 C22 38 16 44 10 50 C8 48 9 45 11 44 C16 39 20 34 22 30 Z" fill={color}/>
      {/* Betis kiri */}
      <path d="M10 50 C8 54 10 58 12 58 C14 58 16 56 16 54 C14 52 12 51 10 50 Z" fill={color}/>
      {/* Kaki kanan — ke belakang-bawah */}
      <path d="M32 34 C34 40 38 48 42 54 C44 53 45 50 44 48 C40 43 37 37 34 32 Z" fill={color}/>
      {/* Betis kanan */}
      <path d="M42 54 C44 58 48 60 50 58 C51 56 50 53 48 52 C46 53 44 54 42 54 Z" fill={color}/>
    </svg>
  )
}

// ─── Run / Pelari (nav icon kecil) ───────────────────────────────────────────
export function IconRun({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="44" cy="8" r="6" fill={color}/>
      <path d="M40 14 C36 16 30 22 26 32 L32 34 C35 26 39 21 42 18 Z" fill={color}/>
      <path d="M40 18 C42 16 50 12 54 10 C55 13 53 15 51 16 C48 17 44 20 42 22 Z" fill={color}/>
      <path d="M36 22 C32 26 24 30 20 32 C19 29 21 27 23 26 C27 24 32 20 34 18 Z" fill={color}/>
      <path d="M26 32 C22 38 16 44 10 50 C8 48 9 45 11 44 C16 39 20 34 22 30 Z" fill={color}/>
      <path d="M10 50 C8 54 10 58 12 58 C14 58 16 56 16 54 C14 52 12 51 10 50 Z" fill={color}/>
      <path d="M32 34 C34 40 38 48 42 54 C44 53 45 50 44 48 C40 43 37 37 34 32 Z" fill={color}/>
      <path d="M42 54 C44 58 48 60 50 58 C51 56 50 53 48 52 C46 53 44 54 42 54 Z" fill={color}/>
    </svg>
  )
}
