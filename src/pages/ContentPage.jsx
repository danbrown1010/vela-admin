import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, Pencil, Trash2, Search, X } from 'lucide-react'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 50

// ── Tab definitions ────────────────────────────────────────────────────────────

const TABS = [
  { key: 'trips',        label: 'Trips'   },
  { key: 'gear_items',   label: 'Gear'    },
  { key: 'crew_members', label: 'Crew'    },
  { key: 'tracks',       label: 'Tracks'  },
]

const TAB_CONFIGS = {
  trips: {
    table: 'trips',
    columns: [
      { key: 'name',           label: 'Name'      },
      { key: 'status',         label: 'Status'    },
      { key: 'region',         label: 'Region'    },
      { key: 'owner_email',    label: 'Owner'     },
      { key: 'departure_date', label: 'Departure' },
      { key: 'is_published',   label: 'Published' },
      { key: 'created_at',     label: 'Created'   },
    ],
    editFields: [
      { key: 'name',           label: 'Name',           type: 'text'   },
      { key: 'status',         label: 'Status',         type: 'select', options: ['planning','pre-trip','on-trip','post-trip','active','completed','cancelled'] },
      { key: 'type',           label: 'Type',           type: 'text'   },
      { key: 'region',         label: 'Region',         type: 'text'   },
      { key: 'departure_date', label: 'Departure Date', type: 'date'   },
      { key: 'return_date',    label: 'Return Date',    type: 'date'   },
      { key: 'is_published',   label: 'Published',      type: 'boolean'},
    ],
  },
  gear_items: {
    table: 'gear_items',
    columns: [
      { key: 'name',        label: 'Name'      },
      { key: 'category',    label: 'Category'  },
      { key: 'quantity',    label: 'Qty'       },
      { key: 'condition',   label: 'Condition' },
      { key: 'owner_email', label: 'Owner'     },
      { key: 'on_rig',      label: 'On Rig'   },
      { key: 'created_at',  label: 'Created'   },
    ],
    editFields: [
      { key: 'name',                label: 'Name',         type: 'text'    },
      { key: 'category',            label: 'Category',     type: 'text'    },
      { key: 'quantity',            label: 'Quantity',     type: 'number'  },
      { key: 'condition',           label: 'Condition',    type: 'select', options: ['good','worn','replace'] },
      { key: 'notes',               label: 'Notes',        type: 'textarea'},
      { key: 'vendor',              label: 'Vendor',       type: 'text'    },
      { key: 'on_rig',              label: 'On Rig',       type: 'boolean' },
      { key: 'include_in_checklist',label: 'In Checklist', type: 'boolean' },
    ],
  },
  crew_members: {
    table: 'crew_members',
    columns: [
      { key: 'crew_name',        label: 'Crew'        },
      { key: 'owner_email',      label: 'Member'      },
      { key: 'role',             label: 'Role'        },
      { key: 'status',           label: 'Status'      },
      { key: 'invited_at',       label: 'Invited'     },
      { key: 'accepted_at',      label: 'Accepted'    },
      { key: 'invited_by_email', label: 'Invited By'  },
      { key: 'guest_email',      label: 'Guest Email' },
    ],
    editFields: [
      { key: 'role',        label: 'Role',        type: 'select', options: ['pilot','copilot','observer'] },
      { key: 'status',      label: 'Status',      type: 'select', options: ['pending','accepted','declined'] },
      { key: 'guest_email', label: 'Guest Email', type: 'text'   },
    ],
  },
  tracks: {
    table: 'tracks',
    columns: [
      { key: 'name',          label: 'Name'         },
      { key: 'source_format', label: 'Format'       },
      { key: 'point_count',   label: 'Points'       },
      { key: 'distance_m',    label: 'Distance (m)' },
      { key: 'owner_email',   label: 'Owner'        },
      { key: 'created_at',    label: 'Created'      },
    ],
    editFields: [
      { key: 'name',          label: 'Name',          type: 'text' },
      { key: 'source_format', label: 'Source Format', type: 'text' },
    ],
  },
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function relTime(ts) {
  if (!ts) return '—'
  try { return formatDistanceToNow(parseISO(ts), { addSuffix: true }) } catch { return '—' }
}

function fmtDate(ts) {
  if (!ts) return '—'
  try { return format(parseISO(ts), 'MMM d, yyyy') } catch { return ts }
}

function renderCellValue(col, row) {
  const v = row[col.key]
  if (col.key === 'created_at' || col.key === 'invited_at' || col.key === 'accepted_at') return relTime(v)
  if (col.key === 'departure_date' || col.key === 'return_date') return fmtDate(v)
  if (typeof v === 'boolean') return v ? '✓' : '—'
  if (col.key === 'distance_m' && v != null) return `${(v / 1000).toFixed(1)} km`
  if (v == null || v === '') return '—'
  return String(v)
}

function StatusChip({ value }) {
  const colors = {
    planning:  'var(--text-tertiary)',
    'pre-trip':'var(--accent)',
    'on-trip': 'var(--safe)',
    active:    'var(--safe)',
    completed: 'var(--text-tertiary)',
    cancelled: 'var(--danger)',
    good:      'var(--safe)',
    worn:      'var(--warn)',
    replace:   'var(--danger)',
    accepted:  'var(--safe)',
    pending:   'var(--warn)',
    declined:  'var(--danger)',
    pilot:     'var(--accent)',
    copilot:   'var(--text-secondary)',
    observer:  'var(--text-tertiary)',
  }
  const c = colors[value]
  if (!c) return <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{value}</span>
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 7px',
      borderRadius: 'var(--r-pill)',
      background: `${c}22`,
      color: c,
    }}>
      {value}
    </span>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 12px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  color: 'var(--text-primary)',
  fontSize: 14, outline: 'none',
}

// ── Edit form ──────────────────────────────────────────────────────────────────

function EditForm({ fields, values, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {fields.map(f => (
        <div key={f.key}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 500 }}>
            {f.label}
          </label>
          {f.type === 'boolean' ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!values[f.key]}
                onChange={e => onChange(f.key, e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {values[f.key] ? 'Yes' : 'No'}
              </span>
            </label>
          ) : f.type === 'select' ? (
            <select
              value={values[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              style={{ ...inputStyle, fontFamily: 'inherit' }}
            >
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea
              value={values[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          ) : (
            <input
              type={f.type}
              value={values[f.key] ?? ''}
              onChange={e => onChange(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
              style={inputStyle}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── JSON view ──────────────────────────────────────────────────────────────────

function JsonView({ row }) {
  return (
    <pre style={{
      margin: 0, padding: 16,
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-secondary)',
      overflowX: 'auto',
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
    }}>
      {JSON.stringify(row, null, 2)}
    </pre>
  )
}

// ── Table component ────────────────────────────────────────────────────────────

function ContentTable({ tabKey }) {
  const config = TAB_CONFIGS[tabKey]
  const [rows, setRows]           = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(0)
  const [emailFilter, setEmailFilter] = useState('')
  const [debouncedFilter, setDebouncedFilter] = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [viewRow, setViewRow]     = useState(null)
  const [editRow, setEditRow]     = useState(null)
  const [editValues, setEditValues] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const debounceRef = useRef(null)

  // Debounce email filter
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedFilter(emailFilter)
      setPage(0)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [emailFilter])

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = page * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1

      // Resolve email filter → user_ids
      let filteredIds = null
      if (debouncedFilter.trim()) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', `%${debouncedFilter.trim()}%`)
        filteredIds = (profiles ?? []).map(p => p.id)
        if (filteredIds.length === 0) {
          setRows([])
          setTotal(0)
          setLoading(false)
          return
        }
      }

      // Build query
      let q = supabase.from(config.table).select('*', { count: 'exact' })

      if (filteredIds) {
        if (tabKey === 'crew_members') {
          // crew_members: filter on user_id OR guest_email
          const guestFilter = debouncedFilter.trim()
          q = q.or(
            `user_id.in.(${filteredIds.join(',')}),guest_email.ilike.%${guestFilter}%`
          )
        } else {
          q = q.in('user_id', filteredIds)
        }
      }

      const orderCol = tabKey === 'crew_members' ? 'invited_at' : 'created_at'
      q = q.order(orderCol, { ascending: false }).range(from, to)
      const { data, count, error: qErr } = await q
      if (qErr) throw qErr

      // Enrich with owner_email and crew_name
      const enriched = await enrichRows(tabKey, data ?? [])
      setRows(enriched)
      setTotal(count ?? 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tabKey, page, debouncedFilter, config.table])

  useEffect(() => { fetchRows() }, [fetchRows])

  const handleEditOpen = (row) => {
    const init = {}
    config.editFields.forEach(f => { init[f.key] = row[f.key] ?? '' })
    setEditValues(init)
    setEditRow(row)
  }

  const handleEditSave = async () => {
    setEditLoading(true)
    try {
      const { error } = await supabase
        .from(config.table)
        .update(editValues)
        .eq('id', editRow.id)
      if (error) throw error
      setEditRow(null)
      await fetchRows()
    } catch (e) {
      alert('Save failed: ' + e.message)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from(config.table)
        .delete()
        .eq('id', deleteRow.id)
      if (error) throw error
      setDeleteRow(null)
      await fetchRows()
    } catch (e) {
      alert('Delete failed: ' + e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)', pointerEvents: 'none',
          }} />
          <input
            value={emailFilter}
            onChange={e => setEmailFilter(e.target.value)}
            placeholder="Filter by owner email…"
            style={{
              ...inputStyle,
              paddingLeft: 32,
              paddingRight: emailFilter ? 28 : 12,
            }}
          />
          {emailFilter && (
            <button onClick={() => setEmailFilter('')} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', display: 'flex', padding: 0,
            }}>
              <X size={13} />
            </button>
          )}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {total} row{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, color: 'var(--text-secondary)', fontSize: 14 }}>
            <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Loading…
          </div>
        ) : error ? (
          <div style={{ padding: 32, color: 'var(--danger)', fontSize: 14 }}>Error: {error}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
            {debouncedFilter ? `No results for "${debouncedFilter}"` : 'No rows found'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {config.columns.map(col => (
                  <th key={col.key} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                    color: 'var(--text-tertiary)', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    whiteSpace: 'nowrap',
                  }}>
                    {col.label}
                  </th>
                ))}
                <th style={{
                  padding: '10px 14px', textAlign: 'right',
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                  color: 'var(--text-tertiary)', textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  width: 110,
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  {config.columns.map(col => {
                    const v = row[col.key]
                    const isStatus = ['status','condition','role'].includes(col.key) && v
                    const isOwner  = col.key === 'owner_email'
                    return (
                      <td key={col.key} style={{
                        padding: '9px 14px',
                        fontSize: 13,
                        color: isOwner ? 'var(--text-secondary)' : 'var(--text-primary)',
                        borderBottom: '1px solid var(--border)',
                        verticalAlign: 'middle',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {isStatus
                          ? <StatusChip value={v} />
                          : renderCellValue(col, row)
                        }
                      </td>
                    )
                  })}
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <IconBtn icon={Eye}    title="View"   onClick={() => setViewRow(row)} />
                      <IconBtn icon={Pencil} title="Edit"   onClick={() => handleEditOpen(row)} />
                      <IconBtn icon={Trash2} title="Delete" onClick={() => setDeleteRow(row)} danger />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      {/* View modal */}
      {viewRow && (
        <Modal title={`View ${config.table} — ${viewRow.id.slice(0, 8)}…`} onClose={() => setViewRow(null)} width={720}>
          <JsonView row={viewRow} />
        </Modal>
      )}

      {/* Edit modal */}
      {editRow && (
        <Modal title={`Edit ${config.table} — ${editRow.id.slice(0, 8)}…`} onClose={() => setEditRow(null)} width={520}>
          <EditForm
            fields={config.editFields}
            values={editValues}
            onChange={(k, v) => setEditValues(prev => ({ ...prev, [k]: v }))}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setEditRow(null)} style={{
              padding: '8px 16px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
            }}>
              Cancel
            </button>
            <button onClick={handleEditSave} disabled={editLoading} style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              border: 'none', borderRadius: 'var(--r-sm)',
              color: '#fff', cursor: editLoading ? 'wait' : 'pointer',
              fontSize: 13, fontWeight: 500,
              opacity: editLoading ? 0.7 : 1,
            }}>
              {editLoading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteRow && (
        <ConfirmDialog
          title="Delete this row?"
          description={`This will permanently delete the ${config.table} record. This cannot be undone.`}
          confirmWord="DELETE"
          loading={deleteLoading}
          onConfirm={handleDelete}
          onClose={() => setDeleteRow(null)}
        />
      )}
    </div>
  )
}

// ── Row enrichment (add owner_email, crew_name) ────────────────────────────────

async function enrichRows(tabKey, rows) {
  if (rows.length === 0) return rows

  const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]

  // Batch-fetch profiles for owner emails
  let emailMap = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)
    emailMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.email]))
  }

  // For crew_members, also fetch crew names + inviter emails
  let crewMap = {}
  let inviterMap = {}
  if (tabKey === 'crew_members') {
    const crewIds    = [...new Set(rows.map(r => r.crew_id).filter(Boolean))]
    const inviterIds = [...new Set(rows.map(r => r.invited_by).filter(Boolean))]

    const [crewRes, inviterRes] = await Promise.all([
      crewIds.length > 0
        ? supabase.from('crews').select('id, name').in('id', crewIds)
        : Promise.resolve({ data: [] }),
      inviterIds.length > 0
        ? supabase.from('profiles').select('id, email').in('id', inviterIds)
        : Promise.resolve({ data: [] }),
    ])
    crewMap    = Object.fromEntries((crewRes.data    ?? []).map(c => [c.id, c.name]))
    inviterMap = Object.fromEntries((inviterRes.data ?? []).map(p => [p.id, p.email]))
  }

  return rows.map(row => ({
    ...row,
    owner_email: emailMap[row.user_id] ?? row.guest_email ?? '—',
    ...(tabKey === 'crew_members' ? {
      crew_name:        crewMap[row.crew_id]     ?? '—',
      invited_by_email: inviterMap[row.invited_by] ?? '—',
    } : {}),
  }))
}

// ── Icon button ────────────────────────────────────────────────────────────────

function IconBtn({ icon: Icon, title, onClick, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)',
        color: danger ? 'var(--danger)' : 'var(--text-secondary)',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <Icon size={13} />
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('trips')

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
          Content Management
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>
          Content
        </h1>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2,
        borderBottom: '1px solid var(--border)',
        marginBottom: 24,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              marginBottom: -1,
              transition: 'color var(--dur-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Keyed so state resets on tab change */}
      <ContentTable key={activeTab} tabKey={activeTab} />
    </div>
  )
}
