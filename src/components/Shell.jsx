import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { UserCog, Database, Activity, Wrench, Bug, LogOut, Sun, Moon, Leaf, MonitorSmartphone } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../context/ThemeContext'

const NAV_ITEMS = [
  { to: '/users',   label: 'Users',        Icon: UserCog  },
  { to: '/content', label: 'Content',      Icon: Database  },
  { to: '/bugs',    label: 'Bug Reports',  Icon: Bug       },
  { to: '/system',  label: 'System',       Icon: Activity  },
  { to: '/tools',   label: 'Tools',        Icon: Wrench    },
]

const ROUTE_LABELS = {
  '/users':   'Users',
  '/content': 'Content',
  '/bugs':    'Bug Reports',
  '/system':  'System',
  '/tools':   'Tools',
}

const THEME_ICONS = { slate: Sun, parchment: Moon, evergreen: Leaf }
const THEME_LABELS = { slate: 'Slate', parchment: 'Parchment', evergreen: 'Evergreen' }

function TooNarrow() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 16, padding: 32, textAlign: 'center',
      background: 'var(--bg-primary)', color: 'var(--text-secondary)',
    }}>
      <MonitorSmartphone size={40} style={{ color: 'var(--text-tertiary)' }} />
      <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--text-primary)' }}>
        Viewport too narrow
      </div>
      <div style={{ fontSize: 14, maxWidth: 280 }}>
        Vela Admin requires a minimum viewport width of 1024 px. Open it on a laptop or desktop.
      </div>
    </div>
  )
}

export function Shell({ children }) {
  const { user, signOut } = useAuth()
  const { theme, cycleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const breadcrumb = ROUTE_LABELS[location.pathname] ?? 'Dashboard'
  const ThemeIcon = THEME_ICONS[theme] ?? Sun

  return (
    <>
      {/* Narrow-screen guard — CSS-only, no JS resize listener needed */}
      <style>{`
        @media (max-width: 1023px) { .admin-shell { display: none !important; } .admin-narrow { display: flex !important; } }
        @media (min-width: 1024px) { .admin-narrow { display: none !important; } }
      `}</style>

      <div className="admin-narrow" style={{ display: 'none' }}>
        <TooNarrow />
      </div>

      <div className="admin-shell" style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}>
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside style={{
          width: 240,
          flexShrink: 0,
          background: 'var(--bg-tertiary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 24,
        }}>
          {/* Lockup */}
          <div
            onClick={() => navigate('/')}
            style={{
              padding: '0 20px 20px',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <img src="/vela-lockup.png" alt="Vela" style={{ height: 26, display: 'block' }} />
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'var(--accent)',
              marginTop: 5,
              textTransform: 'uppercase',
            }}>
              Admin Console
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '10px 0' }}>
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 20px',
                  margin: '1px 8px',
                  borderRadius: 'var(--r-md)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-card)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all var(--dur-fast)',
                })}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user?.email}
            </div>
            <button
              onClick={signOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                fontSize: 13,
                width: '100%',
                transition: 'color var(--dur-fast)',
              }}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main column ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Top bar */}
          <header style={{
            height: 52,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
          }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
                VELA ADMIN
              </span>
              <span style={{ color: 'var(--border)', fontSize: 14 }}>/</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {breadcrumb}
              </span>
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {user?.email}
              </span>

              {/* Theme toggle */}
              <button
                onClick={cycleTheme}
                title={`Theme: ${THEME_LABELS[theme]} — click to cycle`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)',
                  cursor: 'pointer',
                  fontSize: 12,
                  transition: 'color var(--dur-fast)',
                }}
              >
                <ThemeIcon size={13} />
                {THEME_LABELS[theme]}
              </button>

              {/* Sign out */}
              <button
                onClick={signOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  border: '1px solid transparent',
                  borderRadius: 'var(--r-sm)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          </header>

          {/* Page content */}
          <main style={{
            flex: 1,
            overflow: 'auto',
            padding: '36px 40px',
          }}>
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
