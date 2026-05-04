/**
 * Logo Territory Jogger — Red Rose Theme
 * Ikon pelari dengan lingkaran track dan warna Red Rose
 */

const ROSE = '#C0392B'
const ROSE_DEEP = '#96281B'

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
      {/* Track luar — lingkaran tipis */}
      <circle cx="20" cy="20" r="17" stroke={ROSE} strokeWidth="1.5" opacity="0.18"/>
      {/* Arc progress ~270° */}
      <circle cx="20" cy="20" r="17"
        stroke={ROSE} strokeWidth="2.5"
        strokeDasharray="80 27" strokeDashoffset="20"
        strokeLinecap="round"
        transform="rotate(-90 20 20)"/>
      {/* Kepala pelari */}
      <circle cx="25" cy="9.5" r="2.8" fill={ROSE}/>
      {/* Badan */}
      <path d="M25 12.3L22 17.5L17.5 20" stroke={ROSE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Lengan */}
      <path d="M23 15L27.5 17" stroke={ROSE} strokeWidth="2.2" strokeLinecap="round"/>
      {/* Kaki depan */}
      <path d="M22 17.5L24 23L21.5 28" stroke={ROSE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Kaki belakang */}
      <path d="M22 17.5L19 22L21 27" stroke={ROSE_DEEP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      {/* Titik lokasi kecil */}
      <circle cx="11" cy="31" r="2" fill={ROSE} opacity="0.45"/>
      <circle cx="11" cy="31" r="1" fill={ROSE}/>
    </svg>
  )

  if (variant === 'icon') return <Icon />

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
      <Icon />
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
