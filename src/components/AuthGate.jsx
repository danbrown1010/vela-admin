import { useAuth } from '../hooks/useAuth'
import { Shield, LogOut } from 'lucide-react'

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}

function SignInPage({ onSignIn }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-8"
      style={{ background: 'var(--bg-primary)' }}>
      <img src="/vela-lockup.png" alt="Vela" style={{ height: 40, opacity: 0.9 }} />
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: '32px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        minWidth: 320,
        boxShadow: 'var(--shadow-card)',
      }}>
        <Shield size={28} style={{ color: 'var(--accent)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--text-primary)', marginBottom: 6 }}>
            Admin Access
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Sign in with your Vela Google account
          </div>
        </div>
        <button onClick={onSignIn} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 20px',
          background: 'white',
          color: '#1a1a1a',
          border: '1px solid #ddd',
          borderRadius: 'var(--r-md)',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: 14,
          width: '100%',
          justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}

function DeniedPage({ email, onSignOut }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6"
      style={{ background: 'var(--bg-primary)' }}>
      <img src="/vela-mark.png" alt="Vela" style={{ height: 36, opacity: 0.5 }} />
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: '32px 40px',
        textAlign: 'center',
        maxWidth: 380,
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚫</div>
        <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>
          Access Denied
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {email} does not have admin privileges.
        </div>
        <button onClick={onSignOut} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          cursor: 'pointer',
          fontSize: 14,
          margin: '0 auto',
        }}>
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )
}

export function AuthGate({ children }) {
  const { user, isAdmin, loading, denied, signInWithGoogle, signOut } = useAuth()

  if (loading) return <Spinner />
  if (!user) return <SignInPage onSignIn={signInWithGoogle} />
  if (denied || !isAdmin) return <DeniedPage email={user.email} onSignOut={signOut} />

  return children
}
