/**
 * ProfileSettings — Behance Running App Style
 * My Profile + Settings screen
 */

import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { getProfile, updateProfile } from '../../services/profileService'
import { getWeeklyStats } from '../../services/runSessionService'
import { isValidHexColor } from '../../utils/colorUtils'
import type { UserProfile } from '../../types'

export const AVAILABLE_AVATARS: { id: string; emoji: string; label: string }[] = [
  { id: 'runner',   emoji: '🏃', label: 'Pelari'   },
  { id: 'cyclist',  emoji: '🚴', label: 'Pesepeda' },
  { id: 'hiker',    emoji: '🧗', label: 'Pendaki'  },
  { id: 'ninja',    emoji: '🥷', label: 'Ninja'    },
  { id: 'robot',    emoji: '🤖', label: 'Robot'    },
  { id: 'fox',      emoji: '🦊', label: 'Rubah'    },
  { id: 'lion',     emoji: '🦁', label: 'Singa'    },
  { id: 'eagle',    emoji: '🦅', label: 'Elang'    },
]

interface ProfileSettingsProps {
  userId: string
  onSaved?: (profile: UserProfile) => void
  totalTerritoryKm2?: number
  onSignOut?: () => void
  onShowNotifications?: () => void
  onShowPrivacy?: () => void
  unreadCount?: number
}

interface FormState { username: string; userColor: string; avatarUrl: string }
interface FormErrors { username?: string; userColor?: string; general?: string }

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
      <span style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>{label}</span>
      <button type="button" onClick={() => onChange(!value)}
        style={{
          width: 44, height: 26, borderRadius: 13,
          background: value ? '#C0392B' : '#E0E0E0',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s',
        }}>
        <div style={{
          position: 'absolute', top: 3,
          left: value ? 21 : 3,
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 20px 8px', margin: 0 }}>
        {title}
      </p>
      <div style={{ background: '#fff', borderTop: '1px solid #F5F5F5', borderBottom: '1px solid #F5F5F5' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Row item ─────────────────────────────────────────────────────────────────
function RowItem({ label, value, onPress, isLast = false }: { label: string; value?: string; onPress?: () => void; isLast?: boolean }) {
  return (
    <button type="button" onClick={onPress} disabled={!onPress}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'transparent', border: 'none',
        borderBottom: isLast ? 'none' : '1px solid #F5F5F5',
        cursor: onPress ? 'pointer' : 'default', textAlign: 'left',
      }}>
      <span style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {value && <span style={{ fontSize: 13, color: '#AAA' }}>{value}</span>}
        {onPress && <span style={{ fontSize: 16, color: '#CCC' }}>›</span>}
      </div>
    </button>
  )
}

export function ProfileSettings({
  userId, onSaved, totalTerritoryKm2 = 0,
  onSignOut, onShowNotifications, onShowPrivacy, unreadCount = 0,
}: ProfileSettingsProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>({ username: '', userColor: '#C0392B', avatarUrl: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [weeklyKm, setWeeklyKm] = useState(0)
  const [editMode, setEditMode] = useState(false)
  // Persist UI preferences to localStorage
  const [showSpeed, setShowSpeed] = useState(() => {
    try { return localStorage.getItem('tj_showSpeed') !== 'false' } catch { return true }
  })
  const [voicePrompt, setVoicePrompt] = useState(() => {
    try { return localStorage.getItem('tj_voicePrompt') === 'true' } catch { return false }
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [pr, stats] = await Promise.all([getProfile(userId), getWeeklyStats(userId)])
      if (cancelled) return
      if (pr.data) {
        setProfile(pr.data)
        setForm({ username: pr.data.username, userColor: pr.data.userColor, avatarUrl: pr.data.avatarUrl ?? '' })
      }
      setWeeklyKm(stats.totalDistanceKm)
      setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [userId])

  function validate(): boolean {
    const e: FormErrors = {}
    const u = form.username.trim()
    if (!u) e.username = 'Username tidak boleh kosong'
    else if (u.length < 3) e.username = 'Minimal 3 karakter'
    else if (u.length > 30) e.username = 'Maksimal 30 karakter'
    else if (!/^[a-zA-Z0-9_]+$/.test(u)) e.username = 'Hanya huruf, angka, underscore'
    if (!isValidHexColor(form.userColor)) e.userColor = 'Format warna tidak valid'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true); setErrors({}); setSuggestions([]); setSuccess(null)
    const result = await updateProfile(userId, { username: form.username.trim(), userColor: form.userColor, avatarUrl: form.avatarUrl || undefined })
    setSaving(false)
    if (result.error) {
      const msg = result.error.toLowerCase()
      if (msg.includes('warna')) { setErrors({ userColor: result.error }); if (result.suggestedColors?.length) setSuggestions(result.suggestedColors) }
      else if (msg.includes('username') || msg.includes('nama')) setErrors({ username: result.error })
      else setErrors({ general: result.error })
      return
    }
    if (result.data) { setProfile(result.data); setSuccess('Profil disimpan!'); setEditMode(false); onSaved?.(result.data) }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid #FADBD8', borderTopColor: '#C0392B', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const selAvatar = AVAILABLE_AVATARS.find(a => a.id === form.avatarUrl)
  const emoji = selAvatar?.emoji ?? '🏃'

  return (
    <div style={{ background: '#F5F4F4', minHeight: '100%', paddingBottom: 24 }}>

      {/* Gradient hero */}
      <div style={{
        background: `linear-gradient(135deg, #C0392B 0%, #96281B 60%, #7B1F14 100%)`,
        padding: '52px 20px 28px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: '2.5px solid rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, backdropFilter: 'blur(8px)',
              }}>
                {emoji}
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: '#fff', border: `2px solid #C0392B`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#C0392B' }}>✓</span>
              </div>
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                {profile?.username ?? form.username}
              </h1>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: '0 0 8px', fontFamily: 'monospace' }}>{form.userColor}</p>
              <div style={{ display: 'flex', gap: 14 }}>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{weeklyKm.toFixed(1)}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>km minggu ini</p>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
                <div>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{totalTerritoryKm2.toFixed(2)}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>km² wilayah</p>
                </div>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => { setEditMode(!editMode); if (!editMode) setSuccess(null) }}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 99, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            {editMode ? 'Batal' : 'Edit'}
          </button>
        </div>
      </div>

      {/* ── Edit form ── */}
      {editMode && (
        <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #F0EEEE', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0EEEE' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Edit Profil</p>
          </div>
          <form onSubmit={handleSubmit} noValidate style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {errors.general && <div style={{ padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, color: '#C0392B', fontSize: 13 }}>{errors.general}</div>}
            {success && <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, color: '#16A34A', fontSize: 13, fontWeight: 600 }}>✓ {success}</div>}

            {/* Username */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>User Name</label>
              <input type="text" value={form.username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setForm(p => ({ ...p, username: e.target.value })); setErrors(p => ({ ...p, username: undefined })) }}
                placeholder="jogger123" disabled={saving} maxLength={30}
                style={{ width: '100%', padding: '12px 14px', background: '#F8F8F8', border: `1.5px solid ${errors.username ? '#C0392B' : '#F0F0F0'}`, borderRadius: 12, fontSize: 14, color: '#1A1A1A', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => { if (!errors.username) e.target.style.borderColor = '#F0F0F0' }}
              />
              {errors.username && <p style={{ fontSize: 11, color: '#C0392B', margin: '4px 0 0' }}>{errors.username}</p>}
            </div>

            {/* Color */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Warna Wilayah</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={isValidHexColor(form.userColor) ? form.userColor : '#C0392B'}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { setForm(p => ({ ...p, userColor: e.target.value.toUpperCase() })); setErrors(p => ({ ...p, userColor: undefined })); setSuggestions([]) }}
                  disabled={saving}
                  style={{ width: 44, height: 44, padding: 3, background: '#F8F8F8', border: '1.5px solid #F0F0F0', borderRadius: 10, cursor: 'pointer' }}
                />
                <input type="text" value={form.userColor}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { const v = e.target.value; setForm(p => ({ ...p, userColor: v.startsWith('#') ? v.toUpperCase() : `#${v.toUpperCase()}` })); setErrors(p => ({ ...p, userColor: undefined })); setSuggestions([]) }}
                  placeholder="#C0392B" maxLength={7} disabled={saving}
                  style={{ flex: 1, padding: '12px 14px', background: '#F8F8F8', border: `1.5px solid ${errors.userColor ? '#C0392B' : '#F0F0F0'}`, borderRadius: 12, fontSize: 14, color: '#1A1A1A', outline: 'none', fontFamily: 'monospace' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => { if (!errors.userColor) e.target.style.borderColor = '#F0F0F0' }}
                />
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: isValidHexColor(form.userColor) ? form.userColor : '#EEE', border: '2px solid #F0F0F0', flexShrink: 0 }} />
              </div>
              {errors.userColor && <p style={{ fontSize: 11, color: '#C0392B', margin: '4px 0 0' }}>{errors.userColor}</p>}
              {suggestions.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {suggestions.map(c => (
                    <button key={c} type="button" onClick={() => { setForm(p => ({ ...p, userColor: c })); setSuggestions([]) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#F8F8F8', border: '1px solid #F0F0F0', borderRadius: 99, cursor: 'pointer' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                      <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>{c}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Avatar</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {AVAILABLE_AVATARS.map(av => {
                  const sel = form.avatarUrl === av.id
                  return (
                    <button key={av.id} type="button" onClick={() => setForm(p => ({ ...p, avatarUrl: av.id }))} disabled={saving}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', background: sel ? '#FDECEA' : '#F8F8F8', border: `1.5px solid ${sel ? '#F5B7B1' : '#F0F0F0'}`, borderRadius: 12, cursor: 'pointer' }}>
                      <span style={{ fontSize: 24 }}>{av.emoji}</span>
                      <span style={{ fontSize: 9, color: sel ? '#C0392B' : '#AAA', fontWeight: sel ? 700 : 400 }}>{av.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button type="submit" disabled={saving}
              style={{ padding: '14px', background: saving ? '#F5B7B1' : '#C0392B', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 14px rgba(192,57,43,0.3)' }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        </div>
      )}

      {/* ── Sections ── */}
      <div style={{ margin: '12px 16px 0' }}>
        <Section title="Personal Data">
          <RowItem label="User Name" value={profile?.username ?? '—'} />
          <RowItem label="Warna Wilayah" value={form.userColor} isLast />
        </Section>
      </div>
      <div style={{ margin: '8px 16px 0' }}>
        <Section title="System">
          <div style={{ padding: '0 16px', borderBottom: '1px solid #F5F5F5' }}>
            <Toggle value={showSpeed} onChange={(v) => { setShowSpeed(v); try { localStorage.setItem('tj_showSpeed', String(v)) } catch { /* ignore */ } }} label="Tampilkan Kecepatan" />
          </div>
          <div style={{ padding: '0 16px', borderBottom: '1px solid #F5F5F5' }}>
            <Toggle value={voicePrompt} onChange={(v) => { setVoicePrompt(v); try { localStorage.setItem('tj_voicePrompt', String(v)) } catch { /* ignore */ } }} label="Panduan Suara" />
          </div>
          <RowItem label="Privacy Zone" onPress={onShowPrivacy} isLast />
        </Section>
      </div>
      <div style={{ margin: '8px 16px 0' }}>
        <Section title="Notifikasi">
          <RowItem label="Invasion Alerts" value={unreadCount > 0 ? `${unreadCount} baru` : undefined} onPress={onShowNotifications} isLast />
        </Section>
      </div>

      {/* Sign out */}
      <div style={{ padding: '12px 16px 0' }}>
        <button type="button" onClick={onSignOut}
          style={{ width: '100%', padding: '14px', background: '#fff', color: '#C0392B', border: '1.5px solid rgba(192,57,43,0.25)', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          Keluar
        </button>
      </div>
    </div>
  )
}
