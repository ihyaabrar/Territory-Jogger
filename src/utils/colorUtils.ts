/**
 * Utilitas untuk manajemen warna pengguna.
 * Feature: territory-jogger
 */

/**
 * Generate warna HEX acak yang vivid (saturasi tinggi).
 */
export function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 65 + Math.floor(Math.random() * 20) // 65–85%
  const lightness = 45 + Math.floor(Math.random() * 15)  // 45–60%
  return hslToHex(hue, saturation, lightness)
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Validasi format warna HEX (#RRGGBB).
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

/**
 * Konversi warna HEX ke RGBA untuk opacity.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
