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
  const [success, setSuccess] = useState(false)

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
    setSuccess(true)
    setTimeout(() => onSuccess?.(), 1500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    background: '#F8F6F6', border: '1.5px solid #EEEBEB',
    borderRadius: 14, fontSize: 15, color: '#1A1A1A', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #C0392B 0%, #96281B 60%, #7B1F14 100%)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'fixed', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: 80, left: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px 28px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 14 }}>
          <Logo size="sm" variant="icon" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.03em', textAlign: 'center' }}>Buat Akun</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0, textAlign: 'center' }}>Bergabung dan mulai klaim wilayah</p>
      </div>

      {/* Form card — menyambung ke bawah */}
      <div style={{
        background: '#fff',
        borderRadius: '28px 28px 0 0',
        padding: '24px 20px 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        position: 'relative', zIndex: 1,
        overflowY: 'auto',
      }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px' }}>Akun berhasil dibuat!</p>
            <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>Cek email untuk verifikasi</p>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, color: '#C0392B', fontSize: 13, marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="2"/><path d="M12 7V13" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.2" fill="#C0392B"/></svg>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="jogger123" autoCapitalize="none" disabled={loading} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#C0392B'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = '#EEEBEB'; e.target.style.background = '#F8F6F6' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@contoh.com" autoComplete="email" disabled={loading} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#C0392B'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = '#EEEBEB'; e.target.style.background = '#F8F6F6' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Kata Sandi</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 karakter" autoComplete="new-password" disabled={loading} style={inputStyle}
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
                  transition: 'all 0.2s',
                }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Mendaftar...
                  </span>
                ) : 'Daftar Sekarang'}
              </button>
            </form>
          </>
        )}

        {onSwitchToLogin && !success && (
          <p style={{ marginTop: 18, fontSize: 14, color: '#AAA', textAlign: 'center' }}>
            Sudah punya akun?{' '}
            <button type="button" onClick={onSwitchToLogin}
              style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Masuk
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
