import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthGate } from './components/AuthGate'
import { Shell } from './components/Shell'
import DevRibbon      from './components/DevRibbon'
import ErrorBoundary  from './components/ErrorBoundary'
import LoginPage   from './pages/LoginPage'
import UsersPage       from './pages/UsersPage'
import ContentPage     from './pages/ContentPage'
import BugReportsPage  from './pages/BugReportsPage'
import SystemPage      from './pages/SystemPage'
import ToolsPage       from './pages/ToolsPage'

function AdminApp() {
  return (
    <Shell>
      <Routes>
        <Route index element={<Navigate to="/users" replace />} />
        <Route path="users"   element={<UsersPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="bugs"    element={<BugReportsPage />} />
        <Route path="system"  element={<SystemPage />} />
        <Route path="tools"   element={<ToolsPage />} />
        <Route path="*"       element={<Navigate to="/users" replace />} />
      </Routes>
    </Shell>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <AuthGate>
                <AdminApp />
              </AuthGate>
            } />
          </Routes>
        </BrowserRouter>
        <DevRibbon />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
