'use client'
import { useState, useEffect } from 'react'
import { useSimStore } from '@/store/useSimStore'
import { MAX_LEVEL } from '@/lib/vectors'
import LoadingOverlay from './LoadingOverlay'
import ScenarioTimer from './ScenarioTimer'
import clsx from 'clsx'

function scenarioSeconds(level: number): number {
  return level <= 2 ? 60 : level <= 5 ? 45 : level <= 8 ? 30 : 20
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ProgressBar() {
  const state = useSimStore((s) => s.state)
  const token = useSimStore((s) => s.token)
  const reset = useSimStore((s) => s.reset)
  const paused = useSimStore((s) => s.paused)
  const sidebarOpen = useSimStore((s) => s.sidebarOpen)
  const submitVectors = useSimStore((s) => s.submitVectors)
  const [loading, setLoading] = useState(false)
  const [flashContent, setFlashContent] = useState<{ t: string; c: string } | null>(null)
  const [flashVisible, setFlashVisible] = useState(false)

  const flashKey = `${state?.last_result}-${state?.level}-${state?.scenario_id}-${state?.aggravation}`
  useEffect(() => {
    if (!state?.last_result) return
    const text =
      state.last_result === 'success' ? { t: '✓ Equilíbrio alcançado', c: 'text-green-400' } :
      state.last_result === 'miss'    ? { t: '~ Quase — a crise se intensifica', c: 'text-amber-400' } :
      state.last_result === 'fail'    ? { t: '✕ Distribuição muito distante — tente novamente', c: 'text-red-400' } :
      null
    if (!text) return
    setFlashContent(text)
    setFlashVisible(false)
    const enterTimer = setTimeout(() => setFlashVisible(true), 20)
    const exitTimer  = setTimeout(() => setFlashVisible(false), 2800)
    const hideTimer  = setTimeout(() => setFlashContent(null), 3500)
    return () => { clearTimeout(enterTimer); clearTimeout(exitTimer); clearTimeout(hideTimer) }
  }, [flashKey])

  if (!state) return null

  const level = state.level ?? 0
  const pct = (level / MAX_LEVEL) * 100
  const color = pct > 75 ? '#00c8ff' : pct > 50 ? '#3b82f6' : pct > 25 ? '#f59e0b' : '#22c55e'

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

      <div className={clsx(
        'eco-panel absolute bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[600px] max-w-[calc(100vw-2rem)] px-4 py-3 z-10',
        'transition-opacity duration-300',
        sidebarOpen && 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'
      )} style={{ background: 'rgba(11, 30, 45, 0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        {/* Mobile-only scenario countdown */}
        <div className="lg:hidden mb-2.5">
          <ScenarioTimer
            seconds={scenarioSeconds(state.level ?? 0)}
            resetKey={`${state.scenario_id}-${state.level}-${state.aggravation}`}
            active={!paused && !state.is_victory && !state.is_game_over}
            onExpire={submitVectors}
          />
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-eco-muted uppercase tracking-widest">Progresso do Estado</span>
          <span className="text-sm font-bold" style={{ color }}>Nível {level} / {MAX_LEVEL}</span>
        </div>

        {/* Segmented level bar */}
        <div className="flex gap-1">
          {Array.from({ length: MAX_LEVEL }, (_, i) => (
            <div key={i} className="flex-1 h-2.5 rounded-full overflow-hidden bg-eco-border">
              <div
                className="h-full w-full rounded-full transition-all duration-700"
                style={{
                  background: i < level ? color : 'transparent',
                  boxShadow: i < level ? `0 0 6px ${color}` : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Flash message — grid-rows animates the height so the bar doesn't snap */}
        {!state.is_victory && (
          <div className={clsx(
            'grid transition-all duration-500',
            flashContent && flashVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}>
            <div className="overflow-hidden">
              {flashContent && (
                <div className={clsx('mt-2 text-center text-xs font-semibold', flashContent.c)}>
                  {flashContent.t}
                </div>
              )}
            </div>
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
