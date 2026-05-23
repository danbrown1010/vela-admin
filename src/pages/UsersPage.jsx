import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ShieldCheck, ShieldOff, RefreshCw, UserCheck, UserX, Plus, Bug } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'

function Badge({ children, color }) {
  const colors = {
    admin:  { bg: 'rgba(196,82,26,0.15)',  text: 'var(--accent)'        },
    tester: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6'              },
    user:   { bg: 'var(--bg-secondary)',   text: 'var(--text-tertiary)' },
    safe:   { bg: 'rgba(74,124,63,0.15)',  text: 'var(--safe)'          },
    danger: { bg: 'rgba(139,46,46,0.15)',  text: 'var(--danger)'        },
  }
  const c = colors[color] ?? colors.user
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.05em', background: c.bg, color: c.text,
    }}>
      {children}
    </span>
  )
}

function relTime(ts) {
  if (!ts) return '—'
  try { return formatDistanceToNow(parseISO(ts), { addSuffix: true }) } catch { return '—' }
}

const TH = ({ children, width }) => (
  <th style={{
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    color: 'var(--text-tertiary)', textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', width,
  }}>
    {children}
  </th>
)

const TD = ({ children, muted }) => (
  <td style={{
    padding: '10px 14px', fontSize: 13,
    color: muted ? 'var(--text-tertiary)' : 'var(--text-primary)',
    borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
  }}>
    {children}
  </td>
)

// ── Testers tab ────────────────────────────────────────────────────────────────

function TestersTab() {
  const [testers, setTesters]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [addEmail, setAddEmail]       = useState('')
  const [addLoading, setAddLoading]   = useState(false)
  const [addError, setAddError]       = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tester_users')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setTesters(data ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const email = addEmail.trim().toLowerCase()
    if (!email) return
    setAddLoading(true)
    setAddError(null)
    try {
      // Look up user by email
      const { data: userRows, error: uErr } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .limit(1)
      if (uErr) throw uErr
      if (!userRows || userRows.length === 0) {
        setAddError('User not found. They must sign in to vela-app at least once before being added as a tester.')
        return
      }
      const user = userRows[0]
      const { error: iErr } = await supabase
        .from('tester_users')
        .insert({ id: user.id, email: user.email })
      if (iErr) {
        if (iErr.code === '23505') {
          setAddError(`${email} is already a tester.`)
        } else {
          throw iErr
        }
        return
      }
      setAddEmail('')
      await load()
    } catch (e) {
      setAddError(e.message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirmRemove) return
    setRemoveLoading(true)
    try {
      const { error: err } = await supabase
        .from('tester_users')
        .delete()
        .eq('id', confirmRemove.id)
      if (err) throw err
      setConfirmRemove(null)
      await load()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setRemoveLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', paddingTop: 24 }}>
      <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      Loading testers…
    </div>
  )

  if (error) return <div style={{ color: 'var(--danger)', padding: '20px 0' }}>Error: {error}</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
            Tester Management
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
            Testers <span style={{ fontSize: 15, color: 'var(--text-tertiary)', fontWeight: 400 }}>({testers.length})</span>
          </h2>
        </div>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
        }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Add tester form */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
          Add Tester
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input
              type="email"
              placeholder="user@example.com"
              value={addEmail}
              onChange={e => { setAddEmail(e.target.value); setAddError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                border: `1px solid ${addError ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--r-sm)',
                color: 'var(--text-primary)',
                fontSize: 13, outline: 'none',
              }}
            />
            {addError && (
              <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>
                {addError}
              </div>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={addLoading || !addEmail.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: addEmail.trim() ? 'var(--accent)' : 'var(--bg-secondary)',
              border: '1px solid transparent',
              borderRadius: 'var(--r-sm)',
              color: addEmail.trim() ? '#fff' : 'var(--text-tertiary)',
              cursor: addLoading || !addEmail.trim() ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
              opacity: addLoading ? 0.6 : 1,
            }}
          >
            <Plus size={13} />
            {addLoading ? 'Adding…' : 'Add Tester'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
          The user must have signed in to vela-app at least once.
        </div>
      </div>

      {/* Testers table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Email</TH>
              <TH width={200}>Added</TH>
              <TH width={120}>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {testers.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                  No testers yet — add one above.
                </td>
              </tr>
            )}
            {testers.map(t => (
              <tr key={t.id}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: '#3b82f6', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600, lineHeight: 1,
                    }}>
                      {(t.email?.[0] ?? '?').toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{t.email}</span>
                    <Badge color="tester">tester</Badge>
                  </div>
                </TD>
                <TD muted>{relTime(t.created_at)}</TD>
                <TD>
                  <button
                    onClick={() => setConfirmRemove(t)}
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
                    <UserX size={12} /> Remove
                  </button>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmRemove && (
        <ConfirmDialog
          title={`Remove tester: ${confirmRemove.email}?`}
          description="This user will no longer see the bug report button in vela-app. Type DELETE to confirm."
          confirmWord="DELETE"
          loading={removeLoading}
          onConfirm={handleRemove}
          onClose={() => setConfirmRemove(null)}
        />
      )}
    </div>
  )
}

// ── Users tab ──────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers]       = useState([])
  const [admins, setAdmins]     = useState(new Set())
  const [testers, setTesters]   = useState(new Set())
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [actionUser,       setActionUser]       = useState(null)
  const [actionLoading,    setActionLoading]    = useState(false)
  const [testerActionUser, setTesterActionUser] = useState(null)
  const [testerActionLoading, setTesterActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: usersData,  error: uErr },
        { data: adminData,  error: aErr },
        { data: testerData, error: tErr },
      ] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_users').select('id'),
        supabase.from('tester_users').select('id'),
      ])
      if (uErr) throw uErr
      if (aErr) throw aErr
      if (tErr) throw tErr
      setUsers(usersData ?? [])
      setAdmins(new Set((adminData  ?? []).map(a => a.id)))
      setTesters(new Set((testerData ?? []).map(t => t.id)))
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

  const handleTesterAction = async () => {
    if (!testerActionUser) return
    setTesterActionLoading(true)
    try {
      const { user, action } = testerActionUser
      if (action === 'grant') {
        const { error } = await supabase
          .from('tester_users')
          .insert({ id: user.id, email: user.email })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('tester_users')
          .delete()
          .eq('id', user.id)
        if (error) throw error
      }
      setTesterActionUser(null)
      await load()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setTesterActionLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', paddingTop: 24 }}>
      <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      Loading users…
    </div>
  )

  if (error) return <div style={{ color: 'var(--danger)', padding: '20px 0' }}>Error: {error}</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
            User Management
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
            Users <span style={{ fontSize: 15, color: 'var(--text-tertiary)', fontWeight: 400 }}>({users.length})</span>
          </h2>
        </div>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
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
              <TH width={130}>Role</TH>
              <TH width={160}>Created</TH>
              <TH width={220}>Actions</TH>
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
              const isTst = testers.has(user.id)
              return (
                <tr key={user.id} style={{ transition: 'background var(--dur-fast)' }}>
                  <TD>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {user.raw_user_meta_data?.avatar_url
                        ? <img src={user.raw_user_meta_data.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                        : <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: '#475569', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, lineHeight: 1 }}>
                            {(user.email?.[0] ?? '?').toUpperCase()}
                          </div>
                      }
                      <span style={{ fontWeight: 500 }}>{user.email}</span>
                    </div>
                  </TD>
                  <TD muted>{user.sign_in_count}</TD>
                  <TD muted>{relTime(user.last_sign_in_at)}</TD>
                  <TD>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Badge color={isAdm ? 'admin' : 'user'}>{isAdm ? 'admin' : 'user'}</Badge>
                      {isTst && <Badge color="tester">tester</Badge>}
                    </div>
                  </TD>
                  <TD muted>{relTime(user.created_at)}</TD>
                  <TD>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {isAdm ? (
                        <button
                          onClick={() => setActionUser({ user, action: 'revoke' })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}
                        >
                          <ShieldOff size={12} /> Revoke Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => setActionUser({ user, action: 'grant' })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
                        >
                          <ShieldCheck size={12} /> Make Admin
                        </button>
                      )}
                      {isTst ? (
                        <button
                          onClick={() => setTesterActionUser({ user, action: 'revoke' })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}
                        >
                          <Bug size={12} /> Remove Tester
                        </button>
                      ) : (
                        <button
                          onClick={() => setTesterActionUser({ user, action: 'grant' })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
                        >
                          <Bug size={12} /> Make Tester
                        </button>
                      )}
                    </div>
                  </TD>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {actionUser?.action === 'grant' && (
        <ConfirmDialog
          title={`Grant admin to ${actionUser.user.email}?`}
          description="This user will be able to read and write all user data. Type DELETE to confirm."
          confirmWord="DELETE" loading={actionLoading}
          onConfirm={handleAdminAction} onClose={() => setActionUser(null)}
        />
      )}
      {actionUser?.action === 'revoke' && (
        <ConfirmDialog
          title={`Revoke admin from ${actionUser.user.email}?`}
          description="This user will lose admin access immediately. Type DELETE to confirm."
          confirmWord="DELETE" loading={actionLoading}
          onConfirm={handleAdminAction} onClose={() => setActionUser(null)}
        />
      )}
      {testerActionUser?.action === 'grant' && (
        <ConfirmDialog
          title={`Make ${testerActionUser.user.email} a tester?`}
          description="This user will see the bug report button in vela-app. Type DELETE to confirm."
          confirmWord="DELETE" loading={testerActionLoading}
          onConfirm={handleTesterAction} onClose={() => setTesterActionUser(null)}
        />
      )}
      {testerActionUser?.action === 'revoke' && (
        <ConfirmDialog
          title={`Remove tester: ${testerActionUser.user.email}?`}
          description="This user will no longer see the bug report button in vela-app. Type DELETE to confirm."
          confirmWord="DELETE" loading={testerActionLoading}
          onConfirm={handleTesterAction} onClose={() => setTesterActionUser(null)}
        />
      )}
    </div>
  )
}

// ── Page shell ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'users',   label: 'All Users' },
  { key: 'testers', label: 'Testers'   },
]

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
          User Management
        </div>
        <h1 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>
          Users
        </h1>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)' }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: activeTab === key ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color var(--dur-fast)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users'   && <UsersTab />}
      {activeTab === 'testers' && <TestersTab />}
    </div>
  )
}
