import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Search, X } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import Pagination from '../components/Pagination'
import BugReportDetail from '../components/BugReportDetail'

const PAGE_SIZE = 50

const STATUSES   = ['new', 'in_progress', 'fixed', 'wont_fix', 'duplicate']
const SEVERITIES = ['low', 'medium', 'high']

const STATUS_COLORS = {
  new:         'var(--accent)',
  in_progress: 'var(--warn)',
  fixed:       'var(--safe)',
  wont_fix:    'var(--text-tertiary)',
  duplicate:   'var(--text-tertiary)',
}

const STATUS_LABELS = {
  new:         'New',
  in_progress: 'In Progress',
  fixed:       'Fixed',
  wont_fix:    "Won't Fix",
  duplicate:   'Duplicate',
}

const SEVERITY_COLORS = {
  low:    'var(--text-tertiary)',
  medium: 'var(--warn)',
  high:   'var(--danger)',
}

function relTime(ts) {
  if (!ts) return '—'
  try { return formatDistanceToNow(parseISO(ts), { addSuffix: true }) } catch { return '—' }
}

function StatusPill({ value }) {
  const color = STATUS_COLORS[value] ?? 'var(--text-secondary)'
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 7px',
      borderRadius: 'var(--r-pill)',
      background: `${color}22`,
      color,
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[value] ?? value}
    </span>
  )
}

function SeverityDot({ value }) {
  const color = SEVERITY_COLORS[value] ?? 'var(--text-secondary)'
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0, display: 'inline-block',
      }} />
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
        {value}
      </span>
    </span>
  )
}

function ChipFilter({ options, selected, onChange, colorMap, labelMap }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {options.map(opt => {
        const active = selected.includes(opt)
        const color  = colorMap?.[opt] ?? 'var(--text-secondary)'
        const label  = labelMap?.[opt] ?? (opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, ' '))
        return (
          <button
            key={opt}
            onClick={() => onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])}
            style={{
              padding: '3px 10px',
              fontSize: 12, fontWeight: active ? 600 : 400,
              borderRadius: 'var(--r-pill)',
              border: `1px solid ${active ? color : 'var(--border)'}`,
              background: active ? `${color}22` : 'var(--bg-secondary)',
              color: active ? color : 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'all var(--dur-fast)',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
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

function TH({ children, style }) {
  return (
    <th style={{
      padding: '10px 14px', textAlign: 'left',
      fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
      color: 'var(--text-tertiary)', textTransform: 'uppercase',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </th>
  )
}

function TD({ children, style }) {
  return (
    <td style={{
      padding: '9px 14px',
      fontSize: 13,
      color: 'var(--text-primary)',
      borderBottom: '1px solid var(--border)',
      verticalAlign: 'middle',
      ...style,
    }}>
      {children}
    </td>
  )
}

export default function BugReportsPage() {
  const [rows,   setRows]   = useState([])
  const [total,  setTotal]  = useState(0)
  const [page,   setPage]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,  setError]  = useState(null)
  const [detail, setDetail] = useState(null)

  const [statusFilter,   setStatusFilter]   = useState(['new', 'in_progress'])
  const [severityFilter, setSeverityFilter] = useState([...SEVERITIES])
  const [emailFilter,    setEmailFilter]    = useState('')
  const [searchFilter,   setSearchFilter]   = useState('')
  const [debouncedEmail,  setDebouncedEmail]  = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const emailDebRef  = useRef(null)
  const searchDebRef = useRef(null)

  useEffect(() => {
    clearTimeout(emailDebRef.current)
    emailDebRef.current = setTimeout(() => { setDebouncedEmail(emailFilter); setPage(0) }, 350)
    return () => clearTimeout(emailDebRef.current)
  }, [emailFilter])

  useEffect(() => {
    clearTimeout(searchDebRef.current)
    searchDebRef.current = setTimeout(() => { setDebouncedSearch(searchFilter); setPage(0) }, 350)
    return () => clearTimeout(searchDebRef.current)
  }, [searchFilter])

  useEffect(() => { setPage(0) }, [statusFilter, severityFilter])

  const fetchRows = useCallback(async () => {
    if (statusFilter.length === 0 || severityFilter.length === 0) {
      setRows([]); setTotal(0); setLoading(false); return
    }

    setLoading(true)
    setError(null)
    try {
      const from = page * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1

      let q = supabase
        .from('bug_reports')
        .select('id,reporter_email,description,severity,status,route,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (statusFilter.length < STATUSES.length)   q = q.in('status',   statusFilter)
      if (severityFilter.length < SEVERITIES.length) q = q.in('severity', severityFilter)

      if (debouncedEmail.trim()) {
        q = q.ilike('reporter_email', `%${debouncedEmail.trim()}%`)
      }
      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim()
        q = q.or(`description.ilike.%${s}%,steps_to_reproduce.ilike.%${s}%`)
      }

      const { data, count, error: qErr } = await q
      if (qErr) throw qErr
      setRows(data ?? [])
      setTotal(count ?? 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, severityFilter, debouncedEmail, debouncedSearch])

  useEffect(() => { fetchRows() }, [fetchRows])

  const handleDetailClose = (didChange) => {
    setDetail(null)
    if (didChange) fetchRows()
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
          Quality Assurance
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>
          Bug Reports
        </h1>
      </div>

      {/* Filter panel */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '14px 16px',
        marginBottom: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* Chip filters */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Status
            </span>
            <ChipFilter
              options={STATUSES}
              selected={statusFilter}
              onChange={setStatusFilter}
              colorMap={STATUS_COLORS}
              labelMap={STATUS_LABELS}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Severity
            </span>
            <ChipFilter
              options={SEVERITIES}
              selected={severityFilter}
              onChange={setSeverityFilter}
              colorMap={SEVERITY_COLORS}
            />
          </div>
        </div>

        {/* Text filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '0 0 260px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            <input
              value={emailFilter}
              onChange={e => setEmailFilter(e.target.value)}
              placeholder="Filter by reporter email…"
              style={{ ...inputStyle, paddingLeft: 32, paddingRight: emailFilter ? 28 : 12 }}
            />
            {emailFilter && (
              <button onClick={() => setEmailFilter('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            <input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search description / steps…"
              style={{ ...inputStyle, paddingLeft: 32, paddingRight: searchFilter ? 28 : 12 }}
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>

          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {total} result{total !== 1 ? 's' : ''}
          </span>
        </div>
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
            No bug reports match your filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>Status</TH>
                <TH>Severity</TH>
                <TH>Reporter</TH>
                <TH>Description</TH>
                <TH>Route</TH>
                <TH>Reported</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => setDetail(row.id)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <TD><StatusPill value={row.status} /></TD>
                  <TD><SeverityDot value={row.severity} /></TD>
                  <TD style={{ color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.reporter_email}
                  </TD>
                  <TD style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.description.length > 80 ? row.description.slice(0, 80) + '…' : row.description}
                  </TD>
                  <TD style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {row.route ?? '—'}
                  </TD>
                  <TD style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {relTime(row.created_at)}
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      {detail && (
        <BugReportDetail reportId={detail} onClose={handleDetailClose} />
      )}
    </div>
  )
}
