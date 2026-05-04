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
    <div style={{ minHeight: '100dvh', background: '#F8F8F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>

      {/* Logo */}
      <div style={{ marginBottom: 40 }}>
        <Logo size="lg" />
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 24, padding: '32px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', marginBottom: 6 }}>Selamat Datang</h2>
        <p style={{ fontSize: 13, color: '#AAA', marginBottom: 28 }}>Masuk untuk mulai berlari</p>

        {error && (
          <div style={{ padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, color: '#C0392B', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@contoh.com" autoComplete="email" disabled={loading}
              style={{ width: '100%', padding: '13px 16px', background: '#F8F8F8', border: '1.5px solid #F0F0F0', borderRadius: 14, fontSize: 15, color: '#1A1A1A', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#F0F0F0'}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Kata Sandi</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password" disabled={loading}
              style={{ width: '100%', padding: '13px 16px', background: '#F8F8F8', border: '1.5px solid #F0F0F0', borderRadius: 14, fontSize: 15, color: '#1A1A1A', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#F0F0F0'}
            />
          </div>

          <button type="submit" disabled={loading}
            style={{ padding: '15px', background: loading ? '#F5B7B1' : '#C0392B', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(255,107,53,0.35)', marginTop: 4, letterSpacing: '0.01em' }}>
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>

      {/* Switch */}
      {onSwitchToRegister && (
        <p style={{ marginTop: 24, fontSize: 14, color: '#AAA' }}>
          Belum punya akun?{' '}
          <button type="button" onClick={onSwitchToRegister}
            style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Daftar
          </button>
        </p>
      )}
    </div>
  )
}
