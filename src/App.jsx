import { useAuth } from './hooks/useAuth'
import { AuthGate } from './components/AuthGate'
import { Shell } from './components/Shell'

function WelcomeContent() {
  const { user } = useAuth()
  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Dashboard
      </div>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--text-primary)' }}>
        Welcome back
      </h1>
      <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 15 }}>
        {user?.email}
      </p>
    </div>
  )
}

export default function App() {
  return (
    <AuthGate>
      <Shell>
        <WelcomeContent />
      </Shell>
    </AuthGate>
  )
}
