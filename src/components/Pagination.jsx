import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pageSize, total, onPage }) {
  const totalPages = Math.ceil((total ?? 0) / pageSize)
  const start = page * pageSize + 1
  const end   = Math.min((page + 1) * pageSize, total ?? 0)

  if (!total) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0 4px',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
        {start}–{end} of {total}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            color: page === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
            cursor: page === 0 ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{
          padding: '5px 12px', fontSize: 13,
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          background: 'var(--bg-card)',
        }}>
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages - 1}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            color: page >= totalPages - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
            cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
