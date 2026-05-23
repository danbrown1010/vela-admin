import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminClient } from '../hooks/useAdminClient'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { RefreshCw, ExternalLink, ToggleLeft, ToggleRight, Database, HardDrive, Flag, AlertCircle } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────

function relTime(ts) {
  if (!ts) return '—'
  try { return formatDistanceToNow(parseISO(ts), { addSuffix: true }) } catch { return '—' }
}

function fmtBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes, i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      {action}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  )
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
}

// ── DB Stats ───────────────────────────────────────────────────────────────────

const COUNTED_TABLES = [
  'profiles', 'trips', 'gear_items', 'crew_members', 'trip_positions',
  'tracks', 'vehicles', 'pets', 'glove_box', 'crews',
  'admin_users', 'allowed_users', 'error_logs', 'feature_flags',
  'knowledge_docs', 'user_secrets',
]

const ALL_BUCKETS = ['track-files', 'glove-box', 'pet-photos', 'vehicle-photos']

function DbStats() {
  const { countByTable } = useAdminClient()
  const [counts, setCounts]     = useState(null)
  const [storage, setStorage]   = useState(null)
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tableCountsResult, storageResults] = await Promise.all([
        countByTable(COUNTED_TABLES),
        Promise.all(
          ALL_BUCKETS.map(async (bucket) => {
            const { data, error } = await supabase.rpc('admin_list_storage_objects', { p_bucket: bucket })
            if (error) return { bucket, files: null, bytes: null }
            const files = data?.length ?? 0
            const bytes = data?.reduce((sum, f) => sum + (f.size ?? 0), 0) ?? 0
            return { bucket, files, bytes }
          })
        ),
      ])
      setCounts(tableCountsResult)
      setStorage(storageResults)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [countByTable])

  useEffect(() => { load() }, [load])

  return (
    <Card>
      <SectionHeader
        icon={Database}
        title="Database Stats"
        action={
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
            <RefreshCw size={11} /> Refresh
          </button>
        }
      />
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}><Spinner /> Loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
            {COUNTED_TABLES.map(tbl => (
              <div key={tbl} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {counts?.[tbl] ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{tbl}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <HardDrive size={13} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Storage</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {(storage ?? ALL_BUCKETS.map(b => ({ bucket: b, files: null, bytes: null }))).map(s => (
                <div key={s.bucket} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.bucket}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    {s.files == null ? '—' : `${s.files} files · ${fmtBytes(s.bytes)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

// ── Error Logs ─────────────────────────────────────────────────────────────────

function ErrorLogs() {
  const [logs, setLogs]         = useState([])
  const [sourceFilter, setSourceFilter] = useState('')
  const [limit, setLimit]       = useState(50)
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('error_logs')
        .select('id, user_id, source, message, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (sourceFilter.trim()) q = q.ilike('source', `%${sourceFilter.trim()}%`)
      const { data, error } = await q
      if (error) throw error
      setLogs(data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [sourceFilter, limit])

  useEffect(() => { load() }, [load])

  return (
    <Card>
      <SectionHeader
        icon={AlertCircle}
        title="Recent Error Logs"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ padding: '3px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
              {[25, 50, 100, 250].map(n => <option key={n} value={n}>Last {n}</option>)}
            </select>
            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        }
      />

      <input
        value={sourceFilter}
        onChange={e => setSourceFilter(e.target.value)}
        placeholder="Filter by source…"
        style={{ width: 240, padding: '6px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 12, outline: 'none' }}
      />

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}><Spinner /> Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '16px 0' }}>
          {sourceFilter ? `No logs matching "${sourceFilter}"` : 'No errors logged yet. This table is populated by vela-app error boundaries.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Time', 'Source', 'Message', 'User'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{relTime(log.created_at)}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--accent)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{log.source ?? '—'}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{log.user_id ? log.user_id.slice(0, 8) + '…' : 'anon'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Feature Flags ──────────────────────────────────────────────────────────────

function FeatureFlags() {
  const [flags, setFlags]       = useState([])
  const [saving, setSaving]     = useState(null)
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('feature_flags').select('*').order('id')
    setFlags(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (flag) => {
    setSaving(flag.id)
    const newVal = !flag.enabled
    setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: newVal } : f))
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: newVal })
      .eq('id', flag.id)
    if (error) {
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: flag.enabled } : f))
    }
    setSaving(null)
  }

  return (
    <Card>
      <SectionHeader icon={Flag} title="Feature Flags" />
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}><Spinner /> Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {flags.map(flag => (
            <div key={flag.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{flag.id}</div>
                {flag.description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{flag.description}</div>}
              </div>
              <button
                onClick={() => toggle(flag)}
                disabled={saving === flag.id}
                title={flag.enabled ? 'Click to disable' : 'Click to enable'}
                style={{ background: 'none', border: 'none', cursor: saving === flag.id ? 'wait' : 'pointer', opacity: saving === flag.id ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
              >
                {flag.enabled
                  ? <ToggleRight size={28} style={{ color: 'var(--safe)' }} />
                  : <ToggleLeft  size={28} style={{ color: 'var(--text-tertiary)' }} />
                }
              </button>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            vela-app should query <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 4 }}>feature_flags</code> at startup to honor these flags. See <a href="https://supabase.com/dashboard/project/wyznbarcxwjfjpnrvtpo" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Supabase dashboard</a> for Row Level Security details.
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Usage Stats ────────────────────────────────────────────────────────────────

function UsageStats() {
  return (
    <Card>
      <SectionHeader icon={ExternalLink} title="Supabase Usage" />
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
        Detailed usage metrics (compute hours, egress, storage quotas) are available on the Supabase dashboard. The Management API requires a personal access token not available client-side.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: 'Project Overview', path: '/project/wyznbarcxwjfjpnrvtpo' },
          { label: 'Database Usage',  path: '/project/wyznbarcxwjfjpnrvtpo/reports/database' },
          { label: 'Storage',         path: '/project/wyznbarcxwjfjpnrvtpo/storage/buckets' },
          { label: 'Auth Users',      path: '/project/wyznbarcxwjfjpnrvtpo/auth/users' },
        ].map(({ label, path }) => (
          <a
            key={path}
            href={`https://supabase.com/dashboard${path}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}
          >
            <ExternalLink size={12} /> {label}
          </a>
        ))}
      </div>
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SystemPage() {
  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>System Health</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>System</h1>
      </div>
      <DbStats />
      <ErrorLogs />
      <FeatureFlags />
      <UsageStats />
    </div>
  )
}
