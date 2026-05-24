import { Navigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

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

export default function LoginPage() {
  const { user, loading, authError, signInWithGoogle } = useAuth()

  if (loading) return <Spinner />
  if (user) return <Navigate to="/" replace />

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
        {authError && (
          <div style={{
            fontSize: 13, color: 'var(--danger, #ef4444)',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '8px 12px',
            width: '100%', textAlign: 'center',
            fontFamily: 'var(--font-body)',
          }}>
            {authError}
          </div>
        )}
        <button onClick={signInWithGoogle} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '12px 24px',
          background: 'rgba(26,29,34,0.25)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(53,58,66,0.45)',
          borderRadius: 999,
          boxShadow: '0 4px 32px rgba(0,0,0,0.40)',
          cursor: 'pointer',
          width: '100%',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span style={{ font: '600 14px var(--font-body)', color: 'var(--text-primary)' }}>
            Continue with Google
          </span>
        </button>
      </div>
    </div>
  )
}
