import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { Logo } from '../ui/Logo'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !email.trim() || !password) { setError('Isi semua field'); return }
    if (username.trim().length < 3) { setError('Username minimal 3 karakter'); return }
    if (password.length < 8) { setError('Password minimal 8 karakter'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { username: username.trim() } },
    })
    setLoading(false)
    if (err) {
      const msg = err.message.toLowerCase()
      if (msg.includes('already') || msg.includes('exists')) setError('Email sudah digunakan')
      else setError(err.message)
      return
    }
    onSuccess?.()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    background: '#F8F8F8', border: '1.5px solid #F0F0F0',
    borderRadius: 14, fontSize: 15, color: '#1A1A1A', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#AAA',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    display: 'block', marginBottom: 6,
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F8F8F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', overflowY: 'auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Logo size="md" />
      </div>

      <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 24, padding: '28px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', marginBottom: 6 }}>Buat Akun</h2>
        <p style={{ fontSize: 13, color: '#AAA', marginBottom: 24 }}>Bergabung dan mulai klaim wilayah</p>

        {error && (
          <div style={{ padding: '10px 14px', background: '#FFF0EB', border: '1px solid #FFCFBF', borderRadius: 12, color: '#FF6B35', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="jogger123" autoCapitalize="none" disabled={loading} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#FF6B35'}
              onBlur={e => e.target.style.borderColor = '#F0F0F0'}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@contoh.com" autoComplete="email" disabled={loading} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#FF6B35'}
              onBlur={e => e.target.style.borderColor = '#F0F0F0'}
            />
          </div>
          <div>
            <label style={labelStyle}>Kata Sandi</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 karakter" autoComplete="new-password" disabled={loading} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#FF6B35'}
              onBlur={e => e.target.style.borderColor = '#F0F0F0'}
            />
          </div>

          <button type="submit" disabled={loading}
            style={{ padding: '15px', background: loading ? '#FFCFBF' : '#FF6B35', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(255,107,53,0.35)', marginTop: 4 }}>
            {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
          </button>
        </form>
      </div>

      {onSwitchToLogin && (
        <p style={{ marginTop: 24, fontSize: 14, color: '#AAA' }}>
          Sudah punya akun?{' '}
          <button type="button" onClick={onSwitchToLogin}
            style={{ background: 'none', border: 'none', color: '#FF6B35', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Masuk
          </button>
        </p>
      )}
    </div>
  )
}
