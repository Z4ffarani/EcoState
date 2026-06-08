'use client'
import { useState } from 'react'
import { useSimStore } from '@/store/useSimStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ExitButton() {
  const token = useSimStore((s) => s.token)
  const reset = useSimStore((s) => s.reset)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleExit = async () => {
    setLoading(true)
    setConfirming(false)
    try {
      await fetch(`${API_URL}/session`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* noop */ }
    reset()
  }

  if (confirming) {
    return (
      <div className="eco-panel flex items-center gap-2 px-3 py-2 shrink-0">
        <span className="text-xs text-eco-muted shrink-0">Sair?</span>
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 text-xs text-eco-muted border border-eco-border rounded px-2 py-0.5 hover:text-white hover:border-eco-muted/60 transition-colors"
        >
          Não
        </button>
        <button
          onClick={handleExit}
          disabled={loading}
          className="flex-1 text-xs text-red-400 border border-red-800/50 rounded px-2 py-0.5 hover:border-red-500/70 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          Sim
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={loading}
      title="Encerrar sessão"
      className="eco-panel flex items-center gap-2 px-3 py-2 shrink-0 text-eco-muted hover:text-red-400 hover:border-red-500/40 transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
        <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M9 9.5l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="5" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <span className="text-xs font-medium tracking-wide">Encerrar</span>
    </button>
  )
}
