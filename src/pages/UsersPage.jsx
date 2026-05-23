import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ShieldCheck, ShieldOff, RefreshCw } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'

function Badge({ children, color }) {
  const colors = {
    admin:  { bg: 'rgba(196,82,26,0.15)',  text: 'var(--accent)'   },
    user:   { bg: 'var(--bg-secondary)',    text: 'var(--text-tertiary)' },
    safe:   { bg: 'rgba(74,124,63,0.15)',   text: 'var(--safe)'    },
    danger: { bg: 'rgba(139,46,46,0.15)',   text: 'var(--danger)'  },
  }
  const c = colors[color] ?? colors.user
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 'var(--r-pill)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.05em',
      background: c.bg,
      color: c.text,
    }}>
      {children}
    </span>
  )
}

function relTime(ts) {
  if (!ts) return '—'
  try { return formatDistanceToNow(parseISO(ts), { addSuffix: true }) }
  catch { return '—' }
}

const TH = ({ children, width }) => (
  <th style={{
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    color: 'var(--text-tertiary)', textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    width,
  }}>
    {children}
  </th>
)

const TD = ({ children, muted }) => (
  <td style={{
    padding: '10px 14px',
    fontSize: 13,
    color: muted ? 'var(--text-tertiary)' : 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  }}>
    {children}
  </td>
)

export default function UsersPage() {
  const [users, setUsers]         = useState([])
  const [admins, setAdmins]       = useState(new Set())
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [actionUser, setActionUser] = useState(null) // { user, action: 'grant'|'revoke' }
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: usersData, error: uErr }, { data: adminData, error: aErr }] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_users').select('id'),
      ])
      if (uErr) throw uErr
      if (aErr) throw aErr
      setUsers(usersData ?? [])
      setAdmins(new Set((adminData ?? []).map(a => a.id)))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdminAction = async () => {
    if (!actionUser) return
    setActionLoading(true)
    try {
      const { user, action } = actionUser
      if (action === 'grant') {
        const { error } = await supabase
          .from('admin_users')
          .insert({ id: user.id, email: user.email, role: 'admin' })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('admin_users')
          .delete()
          .eq('id', user.id)
        if (error) throw error
      }
      setActionUser(null)
      await load()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', paddingTop: 40 }}>
      <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      Loading users…
    </div>
  )

  if (error) return (
    <div style={{ color: 'var(--danger)', padding: '20px 0' }}>Error: {error}</div>
  )

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
            User Management
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>
            Users <span style={{ fontSize: 16, color: 'var(--text-tertiary)', fontWeight: 400 }}>({users.length})</span>
          </h1>
        </div>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: 13,
        }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Email</TH>
              <TH width={100}>Sign-ins</TH>
              <TH width={160}>Last sign-in</TH>
              <TH width={90}>Role</TH>
              <TH width={160}>Created</TH>
              <TH width={130}>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                  No users found
                </td>
              </tr>
            )}
            {users.map(user => {
              const isAdm = admins.has(user.id)
              return (
                <tr key={user.id} style={{ transition: 'background var(--dur-fast)' }}>
                  <TD>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {user.raw_user_meta_data?.avatar_url && (
                        <img
                          src={user.raw_user_meta_data.avatar_url}
                          alt=""
                          style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }}
                        />
                      )}
                      <span style={{ fontWeight: 500 }}>{user.email}</span>
                    </div>
                  </TD>
                  <TD muted>{user.sign_in_count}</TD>
                  <TD muted>{relTime(user.last_sign_in_at)}</TD>
                  <TD>
                    <Badge color={isAdm ? 'admin' : 'user'}>
                      {isAdm ? 'admin' : 'user'}
                    </Badge>
                  </TD>
                  <TD muted>{relTime(user.created_at)}</TD>
                  <TD>
                    {isAdm ? (
                      <button
                        onClick={() => setActionUser({ user, action: 'revoke' })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px',
                          background: 'transparent',
                          border: '1px solid var(--danger)',
                          borderRadius: 'var(--r-sm)',
                          color: 'var(--danger)',
                          cursor: 'pointer', fontSize: 12,
                        }}
                      >
                        <ShieldOff size={12} /> Revoke Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => setActionUser({ user, action: 'grant' })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--r-sm)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer', fontSize: 12,
                        }}
                      >
                        <ShieldCheck size={12} /> Make Admin
                      </button>
                    )}
                  </TD>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Grant admin confirm */}
      {actionUser?.action === 'grant' && (
        <ConfirmDialog
          title={`Grant admin to ${actionUser.user.email}?`}
          description="This user will be able to read and write all user data. Type DELETE to confirm."
          confirmWord="DELETE"
          loading={actionLoading}
          onConfirm={handleAdminAction}
          onClose={() => setActionUser(null)}
        />
      )}

      {/* Revoke admin confirm */}
      {actionUser?.action === 'revoke' && (
        <ConfirmDialog
          title={`Revoke admin from ${actionUser.user.email}?`}
          description="This user will lose admin access immediately. Type DELETE to confirm."
          confirmWord="DELETE"
          loading={actionLoading}
          onConfirm={handleAdminAction}
          onClose={() => setActionUser(null)}
        />
      )}
    </div>
  )
}
