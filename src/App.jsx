import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthGate } from './components/AuthGate'
import { Shell } from './components/Shell'
import UsersPage   from './pages/UsersPage'
import ContentPage from './pages/ContentPage'
import SystemPage  from './pages/SystemPage'
import ToolsPage   from './pages/ToolsPage'

function AdminApp() {
  return (
    <Shell>
      <Routes>
        <Route index element={<Navigate to="/users" replace />} />
        <Route path="users"   element={<UsersPage />} />
        <Route path="content" element={<ContentPage />} />
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
      <BrowserRouter>
        <AuthGate>
          <AdminApp />
        </AuthGate>
      </BrowserRouter>
    </ThemeProvider>
  )
}
