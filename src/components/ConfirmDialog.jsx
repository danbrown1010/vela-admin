import { useState } from 'react'
import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ title, description, confirmWord = 'DELETE', onConfirm, onClose, loading }) {
  const [typed, setTyped] = useState('')
  const ready = typed === confirmWord

  return (
    <Modal title="" onClose={onClose} width={440}>
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <AlertTriangle size={32} style={{ color: 'var(--danger)', marginBottom: 12 }} />
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          {description}
        </div>

        <div style={{ marginBottom: 20, textAlign: 'left' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Type <strong style={{ color: 'var(--danger)' }}>{confirmWord}</strong> to confirm
          </label>
          <input
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && ready) onConfirm() }}
            placeholder={confirmWord}
            style={{
              width: '100%', padding: '8px 12px',
              background: 'var(--bg-secondary)',
              border: `1px solid ${ready ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading} style={{
            padding: '8px 16px', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
          }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!ready || loading}
            style={{
              padding: '8px 16px',
              background: ready ? 'var(--danger)' : 'var(--bg-secondary)',
              border: '1px solid transparent',
              borderRadius: 'var(--r-sm)',
              color: ready ? '#fff' : 'var(--text-tertiary)',
              cursor: ready ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 500,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
