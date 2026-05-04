/**
 * InvasionAlert — Territory Jogger
 *
 * Overlay in-app yang ditampilkan di atas peta saat invasion terjadi
 * selama sesi lari aktif.
 *
 * Fitur:
 * - Overlay semi-transparan dengan animasi masuk
 * - Menampilkan nama penyerang dan luas wilayah yang hilang
 * - Auto-dismiss setelah 8 detik
 * - Tombol dismiss manual
 * - Aksesibel (role="alert", aria-live="assertive")
 *
 * Persyaratan: 9.5
 */

import { useEffect, useRef } from 'react'
import type { InvasionNotification } from '../../types'

// ─── Konstanta ────────────────────────────────────────────────────────────────

/** Durasi auto-dismiss dalam milidetik */
const AUTO_DISMISS_MS = 8_000

// ─── Tipe Props ───────────────────────────────────────────────────────────────

interface InvasionAlertProps {
  /** Notifikasi invasion yang akan ditampilkan. Null = tidak tampil. */
  notification: InvasionNotification | null
  /** Dipanggil saat alert di-dismiss */
  onDismiss: () => void
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Pointer events none agar peta tetap bisa diinteraksi
    pointerEvents: 'none' as const,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '1rem',
  },
  alert: {
    pointerEvents: 'auto' as const,
    backgroundColor: '#1f2937',
    color: '#ffffff',
    borderRadius: '0.75rem',
    padding: '1rem 1.25rem',
    maxWidth: 360,
    width: '100%',
    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
    border: '2px solid #ef4444',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    // Animasi slide-down
    animation: 'invasionAlertSlideIn 0.3s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  warningIcon: {
    fontSize: '1.5rem',
    lineHeight: 1,
    flexShrink: 0,
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
    margin: 0,
    color: '#ef4444',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '1.25rem',
    lineHeight: 1,
    padding: '0.25rem',
    borderRadius: '0.25rem',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontSize: '0.875rem',
    color: '#d1d5db',
    margin: 0,
    lineHeight: 1.5,
  },
  attackerName: {
    color: '#f87171',
    fontWeight: 700,
  },
  areaText: {
    color: '#fbbf24',
    fontWeight: 700,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#374151',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: '9999px',
    transition: `width ${AUTO_DISMISS_MS}ms linear`,
  },
} as const

// ─── CSS Animation (injected once) ───────────────────────────────────────────

let animationInjected = false

function injectAnimation() {
  if (animationInjected || typeof document === 'undefined') return
  animationInjected = true

  const style = document.createElement('style')
  style.textContent = `
    @keyframes invasionAlertSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
  document.head.appendChild(style)
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Overlay in-app alert saat invasion terjadi selama sesi lari.
 * Ditampilkan di atas peta dengan auto-dismiss setelah 8 detik.
 * Persyaratan: 9.5
 */
export function InvasionAlert({ notification, onDismiss }: InvasionAlertProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)

  // Inject CSS animation sekali
  injectAnimation()

  // Auto-dismiss setelah AUTO_DISMISS_MS
  useEffect(() => {
    if (!notification) return

    // Reset progress bar
    if (progressRef.current) {
      progressRef.current.style.width = '100%'
      // Trigger reflow untuk memulai animasi
      void progressRef.current.offsetWidth
      progressRef.current.style.width = '0%'
    }

    timerRef.current = setTimeout(() => {
      onDismiss()
    }, AUTO_DISMISS_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [notification, onDismiss])

  if (!notification) return null

  const areaText = notification.areaLostKm2.toFixed(4)

  return (
    <div
      style={styles.overlay}
      aria-live="assertive"
      aria-atomic="true"
    >
      <div
        role="alert"
        style={styles.alert}
        aria-label={`Invasion alert: ${notification.attackerUsername} mengambil ${areaText} km² wilayahmu`}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <span style={styles.warningIcon} aria-hidden="true">🚨</span>
            <h3 style={styles.title}>Wilayahmu Diserang!</h3>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            style={styles.dismissButton}
            aria-label="Tutup peringatan invasion"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <p style={styles.body}>
          <span style={styles.attackerName}>{notification.attackerUsername}</span>
          {' '}sedang mengambil{' '}
          <span style={styles.areaText}>{areaText} km²</span>
          {' '}wilayahmu!
        </p>

        {/* Progress bar auto-dismiss */}
        <div
          style={styles.progressBar}
          aria-hidden="true"
          title={`Alert akan hilang dalam ${AUTO_DISMISS_MS / 1000} detik`}
        >
          <div
            ref={progressRef}
            style={{
              ...styles.progressFill,
              width: '100%',
            }}
          />
        </div>
      </div>
    </div>
  )
}
