'use client'
import { useState } from 'react'
import { useSimStore } from '@/store/useSimStore'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Props {
  className?: string
  label?: string
}

export default function RestartButton({ className, label }: Props) {
  const token = useSimStore((s) => s.token)
  const sessionParams = useSimStore((s) => s.sessionParams)
  const setToken = useSimStore((s) => s.setToken)
  const reset = useSimStore((s) => s.reset)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleRestart = async () => {
    setLoading(true)
    setConfirming(false)
    try {
      await fetch(`${API_URL}/session`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (sessionParams) {
        const res = await fetch(`${API_URL}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_name: sessionParams.name,
            region: sessionParams.region,
            season: sessionParams.season,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setToken(data.token, data.session_id)
          setLoading(false)
          return
        }
      }
    } catch { /* noop */ }
    reset()
  }

  if (confirming) {
    return (
      <div className={clsx('eco-panel flex items-center gap-2 px-3 py-2', label ? 'flex-1' : 'shrink-0', className)}>
        <span className="text-xs text-eco-muted shrink-0">Reiniciar?</span>
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 text-xs text-eco-muted border border-eco-border rounded px-2 py-0.5 hover:text-white hover:border-eco-muted/60 transition-colors"
        >
          Não
        </button>
        <button
          onClick={handleRestart}
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
      title={label ? undefined : 'Reiniciar partida'}
      className={clsx(
        'eco-panel flex items-center justify-center text-eco-muted hover:text-amber-400 hover:border-amber-500/40 transition-colors',
        label ? 'flex-1 gap-2 px-3 py-2' : 'w-9 h-9 shrink-0',
        className
      )}
    >
      <span className="text-base leading-none">{loading ? '…' : '↺'}</span>
      {label && <span className="text-xs font-medium tracking-wide">{label}</span>}
    </button>
  )
}
