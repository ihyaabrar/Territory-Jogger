import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { Logo } from '../ui/Logo'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Isi semua field'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (err) { setError('Email atau kata sandi salah'); return }
    onSuccess?.()
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F4F4', display: 'flex', flexDirection: 'column' }}>

      {/* Gradient top section */}
      <div style={{
        background: 'linear-gradient(135deg, #C0392B 0%, #96281B 60%, #7B1F14 100%)',
        padding: '60px 24px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Logo size="md" variant="icon" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em', textAlign: 'center' }}>Territory Runner</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: 0, textAlign: 'center' }}>Klaim wilayah dengan berlari</p>
      </div>

      {/* Form card */}
      <div style={{ flex: 1, padding: '0 20px 32px', marginTop: -20 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '28px 20px', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', border: '1px solid #F0EEEE' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Selamat Datang</h2>
          <p style={{ fontSize: 13, color: '#AAA', margin: '0 0 24px' }}>Masuk untuk mulai berlari</p>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, color: '#C0392B', fontSize: 13, marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="2"/><path d="M12 7V13" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.2" fill="#C0392B"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@contoh.com" autoComplete="email" disabled={loading}
                style={{ width: '100%', padding: '13px 16px', background: '#F8F6F6', border: '1.5px solid #EEEBEB', borderRadius: 14, fontSize: 15, color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#C0392B'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#EEEBEB'; e.target.style.background = '#F8F6F6' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Kata Sandi</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" disabled={loading}
                style={{ width: '100%', padding: '13px 16px', background: '#F8F6F6', border: '1.5px solid #EEEBEB', borderRadius: 14, fontSize: 15, color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#C0392B'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#EEEBEB'; e.target.style.background = '#F8F6F6' }}
              />
            </div>
            <button type="submit" disabled={loading}
              style={{
                padding: '15px', marginTop: 4,
                background: loading ? '#E8A09A' : 'linear-gradient(135deg, #C0392B 0%, #96281B 100%)',
                color: '#fff', border: 'none', borderRadius: 16,
                fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(192,57,43,0.4)',
                letterSpacing: '0.01em', transition: 'all 0.2s',
              }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Masuk...
                </span>
              ) : 'Masuk'}
            </button>
          </form>
        </div>

        {onSwitchToRegister && (
          <p style={{ marginTop: 20, fontSize: 14, color: '#AAA', textAlign: 'center' }}>
            Belum punya akun?{' '}
            <button type="button" onClick={onSwitchToRegister}
              style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Daftar Sekarang
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
