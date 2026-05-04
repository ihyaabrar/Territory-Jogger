/**
 * Logo Territory Runner
 * Terinspirasi dari app icon: map pin + runner + dashed route di atas peta
 * Background merah, elemen putih
 */

const ROSE = '#C0392B'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon' | 'wordmark'
}

// ─── App Icon SVG (map pin + runner + map) ────────────────────────────────────
function AppIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background rounded square */}
      <rect width="100" height="100" rx="22" fill={ROSE}/>

      {/* ── Peta / territory shape ── */}
      <path d="M18 62 L28 55 L45 58 L62 52 L78 56 L82 72 L68 78 L50 74 L32 78 L18 72 Z"
        fill="white" opacity="0.9"/>

      {/* ── Dashed route di peta ── */}
      <path d="M30 70 Q42 64 55 66 Q65 68 72 63"
        stroke={ROSE} strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" fill="none"/>

      {/* ── Map Pin ── */}
      {/* Shadow/depth */}
      <ellipse cx="40" cy="62" rx="8" ry="3" fill="rgba(0,0,0,0.15)"/>
      {/* Pin body */}
      <path d="M40 20 C31 20 24 27 24 36 C24 48 40 62 40 62 C40 62 56 48 56 36 C56 27 49 20 40 20 Z"
        fill="white"/>
      {/* Pin hole */}
      <circle cx="40" cy="36" r="7" fill={ROSE}/>

      {/* ── Runner figure ── */}
      {/* Kepala */}
      <circle cx="72" cy="34" r="5" fill="white"/>
      {/* Badan */}
      <path d="M70 39 L66 48" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Lengan kanan ke depan */}
      <path d="M68 42 L62 46" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      {/* Lengan kiri ke belakang */}
      <path d="M68 42 L74 39" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      {/* Paha kiri ke depan */}
      <path d="M66 48 L60 54" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Betis kiri */}
      <path d="M60 54 L63 60" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      {/* Paha kanan ke belakang */}
      <path d="M66 48 L72 53" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Betis kanan */}
      <path d="M72 53 L78 57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

export function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  const scale = { xs: 0.5, sm: 0.7, md: 1, lg: 1.4 }[size]

  const iconSize = Math.round(40 * scale)
  const titleSize = Math.round(22 * scale)
  const subtitleSize = Math.round(9 * scale)

  if (variant === 'icon') return <AppIcon size={iconSize} />

  if (variant === 'wordmark') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: titleSize, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em' }}>
          Jogger
        </span>
        <span style={{ fontSize: subtitleSize, fontWeight: 700, color: ROSE, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Territory
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(10 * scale) }}>
      <AppIcon size={iconSize} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: titleSize, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em' }}>
          Jogger
        </span>
        <span style={{ fontSize: subtitleSize, fontWeight: 700, color: ROSE, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Territory
        </span>
      </div>
    </div>
  )
}
