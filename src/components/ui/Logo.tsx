/**
 * Logo Territory Jogger — Behance Running App Style
 * Clean, minimal, orange accent
 */

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon' | 'wordmark'
}

export function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  const scale = { xs: 0.5, sm: 0.7, md: 1, lg: 1.4 }[size]

  const iconSize = Math.round(40 * scale)
  const titleSize = Math.round(22 * scale)
  const subtitleSize = Math.round(9 * scale)

  const Icon = () => (
    <svg width={iconSize} height={iconSize} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle track */}
      <circle cx="20" cy="20" r="18" stroke="#FF6B35" strokeWidth="2" opacity="0.2"/>
      {/* Progress arc ~75% */}
      <circle cx="20" cy="20" r="18" stroke="#FF6B35" strokeWidth="2.5"
        strokeDasharray="85 28" strokeDashoffset="22"
        strokeLinecap="round" transform="rotate(-90 20 20)"/>
      {/* Runner figure */}
      {/* Head */}
      <circle cx="24" cy="10" r="2.5" fill="#FF6B35"/>
      {/* Body */}
      <path d="M24 12.5 L21 18 L17 21" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Arms */}
      <path d="M22 15 L26 17" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round"/>
      {/* Legs */}
      <path d="M21 18 L19 24 L16 27" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 18 L24 23 L27 25" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Location dot */}
      <circle cx="12" cy="30" r="2" fill="#FF6B35" opacity="0.5"/>
    </svg>
  )

  if (variant === 'icon') return <Icon />

  if (variant === 'wordmark') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: titleSize, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em' }}>
          Jogger
        </span>
        <span style={{ fontSize: subtitleSize, fontWeight: 600, color: '#FF6B35', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Territory
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(10 * scale) }}>
      <Icon />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: titleSize, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em' }}>
          Jogger
        </span>
        <span style={{ fontSize: subtitleSize, fontWeight: 600, color: '#FF6B35', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Territory
        </span>
      </div>
    </div>
  )
}
