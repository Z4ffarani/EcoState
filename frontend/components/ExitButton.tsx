'use client'
import { useState } from 'react'
import { useSimStore } from '@/store/useSimStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ExitButton() {
  const token = useSimStore((s) => s.token)
  const reset = useSimStore((s) => s.reset)
  const [loading, setLoading] = useState(false)

  const handleExit = async () => {
    setLoading(true)
    try {
      await fetch(`${API_URL}/session`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* noop */ }
    reset()
  }

  return (
    <button
      onClick={handleExit}
      disabled={loading}
      title="Encerrar sessão"
      className="eco-panel flex flex-1 min-w-0 items-center justify-center gap-2 px-3 py-2 text-eco-muted hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-50"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
        <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M9 9.5l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="5" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <span className="hidden sm:inline text-xs font-medium tracking-wide truncate">Encerrar</span>
    </button>
  )
}
