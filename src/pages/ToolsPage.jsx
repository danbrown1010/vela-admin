import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Wrench, RefreshCw, Download, Eye, Trash2, UserCheck, CheckCircle, XCircle } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'

// ── Helpers ────────────────────────────────────────────────────────────────────

function Card({ children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24 }}>
      {children}
    </div>
  )
}

function ToolHeader({ icon: Icon, title, description }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{description}</div>
    </div>
  )
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
}

function Btn({ children, onClick, disabled, variant = 'default', loading }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 'var(--r-sm)',
    fontSize: 13, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', transition: 'opacity var(--dur-fast)',
    opacity: disabled ? 0.5 : 1,
  }
  const styles = {
    default: { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    primary: { background: 'var(--accent)', color: '#fff' },
    danger:  { background: 'var(--danger)', color: '#fff' },
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{ ...base, ...styles[variant] }}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function ResultBanner({ result }) {
  if (!result) return null
  return (
    <div style={{
      marginTop: 14, padding: '10px 14px', borderRadius: 'var(--r-md)', fontSize: 13,
      background: result.ok ? 'rgba(74,124,63,0.12)' : 'rgba(139,46,46,0.12)',
      border: `1px solid ${result.ok ? 'var(--safe)' : 'var(--danger)'}`,
      color: result.ok ? 'var(--safe)' : 'var(--danger)',
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      {result.ok ? <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <XCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
      <span>{result.message}</span>
    </div>
  )
}

// ── Tool 1: Backfill bbox ──────────────────────────────────────────────────────

function bboxFromGeojson(geojson) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity

  function processCoords(c) {
    if (!Array.isArray(c) || c.length === 0) return
    if (typeof c[0] === 'number') {
      minLon = Math.min(minLon, c[0]); maxLon = Math.max(maxLon, c[0])
      minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1])
    } else {
      c.forEach(processCoords)
    }
  }

  function processGeom(g) {
    if (!g) return
    if (g.type === 'FeatureCollection') (g.features ?? []).forEach(processGeom)
    else if (g.type === 'Feature') processGeom(g.geometry)
    else if (g.coordinates) processCoords(g.coordinates)
  }

  processGeom(geojson)
  return isFinite(minLon) ? [minLon, minLat, maxLon, maxLat] : null
}

function BackfillBbox() {
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)

  const run = async () => {
    setLoading(true)
    setResult(null)
    try {
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('id, geojson')
        .is('bbox', null)
      if (error) throw error

      if (tracks.length === 0) {
        setResult({ ok: true, message: 'No tracks with missing bbox found. Nothing to backfill.' })
        return
      }

      let updated = 0, skipped = 0
      for (const track of tracks) {
        const bbox = bboxFromGeojson(track.geojson)
        if (!bbox) { skipped++; continue }
        const { error: uErr } = await supabase
          .from('tracks')
          .update({ bbox })
          .eq('id', track.id)
        if (uErr) { skipped++; continue }
        updated++
      }
      setResult({ ok: true, message: `Backfilled ${updated} track bbox${updated !== 1 ? 'es' : ''}${skipped > 0 ? ` (${skipped} skipped — no valid coordinates)` : ''}.` })
    } catch (e) {
      setResult({ ok: false, message: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <ToolHeader
        icon={RefreshCw}
        title="Backfill Missing GeoJSON BBoxes"
        description="Scans all tracks where bbox is null, computes [minLon, minLat, maxLon, maxLat] from the geojson coordinates, and writes it back. Skips tracks with no parseable coordinates."
      />
      <Btn onClick={run} loading={loading} variant="primary">
        <RefreshCw size={13} /> Run Backfill
      </Btn>
      <ResultBanner result={result} />
    </Card>
  )
}

// ── Tool 2: Vacuum orphaned track files ────────────────────────────────────────

function VacuumOrphanedFiles() {
  const [scanning, setScanning]     = useState(false)
  const [orphans, setOrphans]       = useState(null)
  const [selected, setSelected]     = useState(new Set())
  const [confirm, setConfirm]       = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [result, setResult]         = useState(null)

  const scan = async () => {
    setScanning(true)
    setOrphans(null)
    setSelected(new Set())
    setResult(null)
    try {
      const [storageRes, tracksRes] = await Promise.all([
        supabase.rpc('admin_list_storage_objects', { p_bucket: 'track-files' }),
        supabase.from('tracks').select('source_file_path').not('source_file_path', 'is', null),
      ])
      if (storageRes.error) throw storageRes.error
      if (tracksRes.error) throw tracksRes.error

      const trackedPaths = new Set((tracksRes.data ?? []).map(t => t.source_file_path))
      const allFiles = storageRes.data ?? []
      const orphanFiles = allFiles.filter(f => !trackedPaths.has(f.name))
      setOrphans(orphanFiles)
    } catch (e) {
      setResult({ ok: false, message: e.message })
    } finally {
      setScanning(false)
    }
  }

  const toggleSelect = (name) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(orphans?.map(f => f.name) ?? []))
  const selectNone = () => setSelected(new Set())

  const doDelete = async () => {
    setDeleting(true)
    setConfirm(false)
    try {
      const paths = [...selected]
      const { error } = await supabase.storage.from('track-files').remove(paths)
      if (error) throw error
      setOrphans(prev => prev?.filter(f => !selected.has(f.name)) ?? [])
      setSelected(new Set())
      setResult({ ok: true, message: `Deleted ${paths.length} orphaned file${paths.length !== 1 ? 's' : ''}.` })
    } catch (e) {
      setResult({ ok: false, message: e.message })
    } finally {
      setDeleting(false)
    }
  }

  const fmtBytes = (b) => {
    if (!b) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let v = b, i = 0
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
    return `${v.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
  }

  return (
    <Card>
      <ToolHeader
        icon={Trash2}
        title="Vacuum Orphaned Track Files"
        description="Lists files in the track-files storage bucket that have no matching tracks.source_file_path row. These are safe to delete."
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Btn onClick={scan} loading={scanning} variant="default">
          <RefreshCw size={13} /> Scan for Orphans
        </Btn>
        {selected.size > 0 && (
          <Btn onClick={() => setConfirm(true)} variant="danger" disabled={deleting}>
            <Trash2 size={13} /> Delete {selected.size} selected
          </Btn>
        )}
      </div>

      {orphans !== null && (
        orphans.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No orphaned files found. Storage is clean.</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{orphans.length} orphaned file{orphans.length !== 1 ? 's' : ''}</span>
              <button onClick={selectAll} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Select all</button>
              {selected.size > 0 && <button onClick={selectNone} style={{ fontSize: 12, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
              {orphans.map(f => (
                <label key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.has(f.name)} onChange={() => toggleSelect(f.name)} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{fmtBytes(f.size)}</span>
                </label>
              ))}
            </div>
          </>
        )
      )}

      <ResultBanner result={result} />

      {confirm && (
        <ConfirmDialog
          title={`Delete ${selected.size} orphaned file${selected.size !== 1 ? 's' : ''}?`}
          description="These files have no matching tracks row. Deletion is permanent and cannot be undone."
          confirmWord="DELETE"
          loading={deleting}
          onConfirm={doDelete}
          onClose={() => setConfirm(false)}
        />
      )}
    </Card>
  )
}

// ── Tool 3: Export user data ───────────────────────────────────────────────────

const EXPORT_TABLES = [
  { table: 'profiles',    key: 'profile',     single: true },
  { table: 'trips',       key: 'trips'        },
  { table: 'gear_items',  key: 'gear_items'   },
  { table: 'crew_members',key: 'crew_members' },
  { table: 'tracks',      key: 'tracks',      omit: ['geojson'] },
  { table: 'vehicles',    key: 'vehicles'     },
  { table: 'pets',        key: 'pets'         },
]

function ExportUserData() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)

  const run = async () => {
    const e = email.trim()
    if (!e) return
    setLoading(true)
    setResult(null)
    try {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', e)
        .single()
      if (pErr || !profile) throw new Error(`No user found with email "${e}"`)

      const userId = profile.id
      const exportData = { exported_at: new Date().toISOString(), user: profile }

      await Promise.all(
        EXPORT_TABLES.filter(t => !t.single).map(async ({ table, key, omit }) => {
          const { data } = await supabase.from(table).select('*').eq('user_id', userId)
          const rows = data ?? []
          exportData[key] = omit
            ? rows.map(row => { const r = { ...row }; omit.forEach(f => delete r[f]); return r })
            : rows
        })
      )

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `vela-export-${e.replace('@', '_')}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      const rowCounts = EXPORT_TABLES.filter(t => !t.single)
        .map(t => `${exportData[t.key]?.length ?? 0} ${t.key}`)
        .join(', ')
      setResult({ ok: true, message: `Exported ${e}: ${rowCounts}.` })
    } catch (e) {
      setResult({ ok: false, message: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <ToolHeader
        icon={Download}
        title="Export User Data"
        description="Generates a JSON file containing all data for a given user across trips, gear, crew, tracks, vehicles, and pets. Large track geojson fields are excluded for size."
      />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') run() }}
          placeholder="user@example.com"
          style={{ padding: '8px 12px', width: 280, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
        />
        <Btn onClick={run} loading={loading} variant="primary" disabled={!email.trim()}>
          <Download size={13} /> Export
        </Btn>
      </div>
      <ResultBanner result={result} />
    </Card>
  )
}

// ── Tool 4: Impersonate user (read-only) ───────────────────────────────────────

function ImpersonateUser() {
  const [users, setUsers]   = useState([])
  const [userId, setUserId] = useState('')
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(true)

  useEffect(() => {
    supabase.from('users').select('id, email').order('email').then(({ data }) => {
      setUsers(data ?? [])
      setUsersLoading(false)
    })
  }, [])

  const load = async () => {
    if (!userId) return
    setLoading(true)
    setData(null)
    try {
      const [trips, gear, crew, tracks, profile] = await Promise.all([
        supabase.from('trips').select('id, name, status, region, departure_date, is_published, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('gear_items').select('id, name, category, condition, on_rig').eq('user_id', userId).order('name'),
        supabase.from('crew_members').select('id, role, status, invited_at, crew_id').eq('user_id', userId),
        supabase.from('tracks').select('id, name, source_format, point_count, distance_m, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', userId).single(),
      ])
      setData({
        profile: profile.data,
        trips: trips.data ?? [],
        gear: gear.data ?? [],
        crew: crew.data ?? [],
        tracks: tracks.data ?? [],
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const userEmail = users.find(u => u.id === userId)?.email ?? ''

  return (
    <Card>
      <ToolHeader
        icon={UserCheck}
        title="Impersonate User (Read-Only)"
        description="Displays data exactly as a selected user would see it in the app. Useful for debugging missing data, RLS issues, or user-reported problems. No writes are made."
      />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: data ? 20 : 0 }}>
        <select
          value={userId}
          onChange={e => setUserId(e.target.value)}
          disabled={usersLoading}
          style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 13, minWidth: 280, cursor: 'pointer' }}
        >
          <option value="">{usersLoading ? 'Loading users…' : 'Select a user…'}</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
        </select>
        <Btn onClick={load} loading={loading} variant="primary" disabled={!userId}>
          <Eye size={13} /> View as User
        </Btn>
      </div>

      {data && (
        <div style={{ marginTop: 4 }}>
          <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{userEmail}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>id: {userId}</div>
            {data.profile?.plan && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Plan: {data.profile.plan}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              {
                label: `Trips (${data.trips.length})`,
                rows: data.trips,
                render: t => `${t.name} · ${t.status}${t.is_published ? ' · published' : ''}`,
              },
              {
                label: `Gear (${data.gear.length})`,
                rows: data.gear.slice(0, 10),
                more: data.gear.length > 10 ? data.gear.length - 10 : 0,
                render: g => `${g.name}${g.category ? ` · ${g.category}` : ''} · ${g.condition}`,
              },
              {
                label: `Crew Memberships (${data.crew.length})`,
                rows: data.crew,
                render: c => `${c.role} · ${c.status}`,
              },
              {
                label: `Tracks (${data.tracks.length})`,
                rows: data.tracks,
                render: t => `${t.name} · ${t.source_format} · ${t.point_count} pts`,
              },
            ].map(({ label, rows, more, render }) => (
              <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{label}</div>
                {rows.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>None</div>
                ) : (
                  rows.map(row => (
                    <div key={row.id} style={{ fontSize: 12, color: 'var(--text-primary)', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                      {render(row)}
                    </div>
                  ))
                )}
                {more > 0 && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>…and {more} more</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>Owner Tools</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>Tools</h1>
      </div>
      <BackfillBbox />
      <VacuumOrphanedFiles />
      <ExportUserData />
      <ImpersonateUser />
    </div>
  )
}
