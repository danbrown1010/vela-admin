import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'

const STATUSES = ['new', 'in_progress', 'fixed', 'wont_fix', 'duplicate']

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

function fmtFull(ts) {
  if (!ts) return '—'
  try { return format(parseISO(ts), 'MMM d, yyyy h:mm a') } catch { return '—' }
}

const inputStyle = {
  width: '100%', padding: '8px 12px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  color: 'var(--text-primary)',
  fontSize: 14, outline: 'none',
}

const sectionLabel = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
  color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6,
}

const textBlock = {
  fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  padding: '10px 12px',
}

export default function BugReportDetail({ reportId, onClose }) {
  const [report,       setReport]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [screenshotUrl, setScreenshotUrl] = useState(null)
  const [adminNotes,   setAdminNotes]   = useState('')
  const [saving,       setSaving]       = useState(false)
  const [statusError,  setStatusError]  = useState(null)
  const [showDelete,   setShowDelete]   = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [changed,      setChanged]      = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .eq('id', reportId)
        .single()
      if (!error && data) {
        setReport(data)
        setAdminNotes(data.admin_notes ?? '')
        if (data.screenshot_path) {
          const { data: urlData } = await supabase.storage
            .from('bug-reports')
            .createSignedUrl(data.screenshot_path, 3600)
          if (urlData?.signedUrl) setScreenshotUrl(urlData.signedUrl)
        }
      }
      setLoading(false)
    }
    load()
  }, [reportId])

  const updateStatus = async (newStatus) => {
    const prevStatus = report.status
    setStatusError(null)
    setReport(prev => ({ ...prev, status: newStatus }))
    const { error } = await supabase.from('bug_reports').update({ status: newStatus }).eq('id', reportId)
    if (error) {
      setReport(prev => ({ ...prev, status: prevStatus }))
      setStatusError(`Failed to update status: ${error.message}`)
      return
    }
    setChanged(true)
  }

  const saveNotes = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('bug_reports')
      .update({ admin_notes: adminNotes })
      .eq('id', reportId)
    if (!error) setChanged(true)
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    if (report?.screenshot_path) {
      await supabase.storage.from('bug-reports').remove([report.screenshot_path])
    }
    await supabase.from('bug_reports').delete().eq('id', reportId)
    setDeleting(false)
    onClose(true)
  }

  if (loading || !report) {
    return (
      <Modal title="Bug Report" onClose={() => onClose(false)} width={720}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, color: 'var(--text-secondary)', fontSize: 14 }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Loading…
        </div>
      </Modal>
    )
  }

  const severityColor = SEVERITY_COLORS[report.severity] ?? 'var(--text-secondary)'

  return (
    <>
      <Modal title={`Bug Report — ${report.id.slice(0, 8)}…`} onClose={() => onClose(changed)} width={780}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header: status dropdown + severity chip + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={report.status}
              onChange={e => updateStatus(e.target.value)}
              style={{
                ...inputStyle,
                width: 'auto', padding: '5px 10px',
                fontFamily: 'inherit', cursor: 'pointer',
                borderColor: statusError ? 'var(--danger)' : (STATUS_COLORS[report.status] ?? 'var(--border)'),
                color: STATUS_COLORS[report.status] ?? 'var(--text-primary)',
                fontWeight: 600, fontSize: 13,
              }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            {statusError && (
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>{statusError}</span>
            )}

            <span style={{
              fontSize: 12, fontWeight: 600, padding: '3px 10px',
              borderRadius: 'var(--r-pill)',
              background: `${severityColor}22`,
              color: severityColor,
              textTransform: 'capitalize',
            }}>
              {report.severity} severity
            </span>

            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
              {fmtFull(report.created_at)}
            </span>
          </div>

          {/* Reporter */}
          <div>
            <div style={sectionLabel}>Reporter</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {report.reporter_email}
            </div>
          </div>

          {/* Description */}
          <div>
            <div style={sectionLabel}>Description</div>
            <div style={textBlock}>{report.description}</div>
          </div>

          {/* Steps to reproduce */}
          {report.steps_to_reproduce && (
            <div>
              <div style={sectionLabel}>Steps to Reproduce</div>
              <div style={textBlock}>{report.steps_to_reproduce}</div>
            </div>
          )}

          {/* Screenshot */}
          {screenshotUrl && (
            <div>
              <div style={sectionLabel}>Screenshot</div>
              <a href={screenshotUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={screenshotUrl}
                  alt="Bug screenshot"
                  style={{
                    width: '100%', maxHeight: 320, objectFit: 'contain',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border)',
                    cursor: 'zoom-in',
                    background: 'var(--bg-secondary)',
                    display: 'block',
                  }}
                />
              </a>
            </div>
          )}

          {/* Environment */}
          <div>
            <div style={sectionLabel}>Environment</div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              padding: '10px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-tertiary)' }}>route</span>
              <span style={{ color: 'var(--text-primary)' }}>{report.route ?? '—'}</span>

              <span style={{ color: 'var(--text-tertiary)' }}>version</span>
              <span style={{ color: 'var(--text-primary)' }}>{report.app_version ?? '—'}</span>

              <span style={{ color: 'var(--text-tertiary)' }}>viewport</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {report.viewport_width && report.viewport_height
                  ? `${report.viewport_width} × ${report.viewport_height}`
                  : '—'}
              </span>

              <span style={{ color: 'var(--text-tertiary)' }}>user agent</span>
              <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{report.user_agent ?? '—'}</span>
            </div>
          </div>

          {/* Admin notes */}
          <div>
            <div style={sectionLabel}>Admin Notes</div>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes…"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={saveNotes}
                disabled={saving}
                style={{
                  padding: '7px 16px',
                  background: 'var(--accent)', border: 'none',
                  borderRadius: 'var(--r-sm)',
                  color: '#fff', cursor: saving ? 'wait' : 'pointer',
                  fontSize: 13, fontWeight: 500,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button
              onClick={() => setShowDelete(true)}
              style={{
                padding: '7px 14px',
                background: 'transparent',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Delete report
            </button>
          </div>

        </div>
      </Modal>

      {showDelete && (
        <ConfirmDialog
          title="Delete this bug report?"
          description="This will permanently delete the report and its screenshot. This cannot be undone."
          confirmWord="DELETE"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
