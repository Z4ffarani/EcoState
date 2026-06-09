'use client'
import { useState } from 'react'
import { useSimStore } from '@/store/useSimStore'
import LoadingOverlay from './LoadingOverlay'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const MILESTONES = [25, 50, 75, 95]
const MILESTONE_LABELS: Record<number, string> = {
  25: 'Estável',
  50: 'Próspero',
  75: 'Avançado',
  95: 'Completo',
}

export default function ProgressBar() {
  const state = useSimStore((s) => s.state)
  const token = useSimStore((s) => s.token)
  const reset = useSimStore((s) => s.reset)
  const [loading, setLoading] = useState(false)

  if (!state) return null

  const progress = state.progress
  const color = progress > 75 ? '#00c8ff' : progress > 50 ? '#3b82f6' : progress > 25 ? '#f59e0b' : '#ef4444'

  const handleRestart = async () => {
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
    <>
      {loading && <LoadingOverlay message="Iniciando nova partida..." />}

      <div className="eco-panel absolute bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[600px] max-w-[calc(100vw-2rem)] px-4 py-3 z-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-eco-muted uppercase tracking-widest">Progresso do Estado</span>
          <span className="text-sm font-bold" style={{ color }}>{progress.toFixed(1)}%</span>
        </div>

        {/* Barra */}
        <div className="relative h-3 bg-eco-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress}%`, background: color, boxShadow: `0 0 8px ${color}` }}
          />
          {MILESTONES.map((m) => (
            <div
              key={m}
              className="absolute top-0 bottom-0 w-px bg-eco-bg/60"
              style={{ left: `${m}%` }}
            />
          ))}
        </div>

        {/* Marcos */}
        <div className="relative mt-1 h-3">
          {MILESTONES.map((m) => (
            <span
              key={m}
              className={clsx(
                'absolute text-[9px] -translate-x-1/2 uppercase',
                progress >= m ? 'text-eco-accent' : 'text-eco-muted'
              )}
              style={{ left: `${m}%` }}
            >
              {MILESTONE_LABELS[m]}
            </span>
          ))}
        </div>

        {/* Mensagens de fim de jogo */}
        {state.is_game_over && (
          <div className="mt-2 text-center">
            <div className="text-red-400 text-sm font-bold eco-critical">☠ {state.message}</div>
            <button
              onClick={handleRestart}
              disabled={loading}
              className="mt-2 px-5 py-1.5 rounded border border-red-500 text-red-400 text-xs font-bold tracking-widest uppercase hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              ↺ Nova Partida
            </button>
          </div>
        )}
        {state.is_victory && (
          <div className="mt-2 text-center">
            <div className="text-eco-accent text-sm font-bold">✦ {state.message}</div>
            <button
              onClick={handleRestart}
              disabled={loading}
              className="mt-2 px-5 py-1.5 rounded border border-eco-accent text-eco-accent text-xs font-bold tracking-widest uppercase hover:bg-eco-accent/20 transition-all disabled:opacity-50"
            >
              ↺ Nova Partida
            </button>
          </div>
        )}
      </div>
    </>
  )
}
