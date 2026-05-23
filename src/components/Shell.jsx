import { useAuth } from '../hooks/useAuth'
import { LogOut } from 'lucide-react'

export function Shell({ children }) {
  const { user, signOut } = useAuth()

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: 'var(--bg-tertiary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
          <img src="/vela-lockup.png" alt="Vela" style={{ height: 28 }} />
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--accent)',
            marginTop: 6,
            textTransform: 'uppercase',
          }}>
            Admin
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {/* Nav items will be added in Phase 3 */}
        </nav>

        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
            {user?.email}
          </div>
          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            cursor: 'pointer',
            fontSize: 13,
            width: '100%',
          }}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: 40,
      }}>
        {children}
      </main>
    </div>
  )
}
