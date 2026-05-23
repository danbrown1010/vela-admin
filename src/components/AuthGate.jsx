import { Navigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
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
  const { user, isAdmin, loading, noSession, denied, signOut } = useAuth()

  if (loading) return <Spinner />
  if (noSession || !user) return <Navigate to="/login" replace />
  if (denied || !isAdmin) return <DeniedPage email={user.email} onSignOut={signOut} />

  return children
}
