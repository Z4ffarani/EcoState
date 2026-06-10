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

  const handleRestart = async () => {
    setLoading(true)
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

  return (
    <button
      onClick={handleRestart}
      disabled={loading}
      title={label ? undefined : 'Reiniciar partida'}
      className={clsx(
        'eco-panel flex items-center justify-center text-eco-muted hover:text-amber-400 hover:border-amber-500/40 transition-colors',
        label ? 'flex-1 min-w-0 gap-2 px-3 py-2' : 'w-9 h-9 shrink-0',
        className
      )}
    >
      <span className="text-base leading-none">{loading ? '…' : '↺'}</span>
      {label && <span className="hidden sm:inline text-xs font-medium tracking-wide truncate">{label}</span>}
    </button>
  )
}
