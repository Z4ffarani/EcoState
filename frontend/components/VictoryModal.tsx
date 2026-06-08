'use client'
import { useMemo, useState } from 'react'
import { useSimStore } from '@/store/useSimStore'
import LoadingOverlay from './LoadingOverlay'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const COLORS = ['#00c8ff', '#ffd700', '#ff6b6b', '#7fff7f', '#ff9f43', '#a29bfe', '#ff79c6', '#50fa7b']
const COUNT = 90

interface Particle { id: number; x: number; color: string; delay: string; duration: string; size: number }

export default function VictoryModal() {
  const state = useSimStore((s) => s.state)
  const token = useSimStore((s) => s.token)
  const reset = useSimStore((s) => s.reset)
  const [loading, setLoading] = useState(false)

  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      x: ((i * 1.1) % 100),
      color: COLORS[i % COLORS.length],
      delay: `${((i * 0.023) % 2).toFixed(2)}s`,
      duration: `${(2.5 + (i % 7) * 0.25).toFixed(2)}s`,
      size: 6 + (i % 5) * 2,
    }))
  , [])

  const isVictory = !!state?.is_victory
  const isGameOver = !!state?.is_game_over
  if (!isVictory && !isGameOver) return null

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Confetti — only on victory */}
      {isVictory && particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle absolute top-0 pointer-events-none"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      {/* Modal */}
      <div className="relative z-10 eco-panel px-8 py-10 text-center w-full max-w-sm mx-4">
        {isVictory ? (
          <>
            <div className="text-5xl mb-3">🌍</div>
            <h2 className="text-2xl font-bold text-eco-accent mb-2 tracking-wide">Missão Cumprida!</h2>
            <p className="text-sm text-eco-muted mb-6 leading-relaxed">
              Você alcançou um EcoState pleno.<br />O futuro está garantido.
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-3">💀</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2 tracking-wide">EcoState Colapsado</h2>
            <p className="text-sm text-eco-muted mb-6 leading-relaxed">
              Os sistemas críticos falharam.<br />Uma nova tentativa é necessária.
            </p>
          </>
        )}
        <button
          onClick={handleRestart}
          disabled={loading}
          className="w-full py-3 rounded border border-eco-accent text-eco-accent font-bold tracking-widest uppercase text-sm hover:bg-eco-accent hover:text-eco-bg transition-all disabled:opacity-50"
        >
          {loading ? 'Reiniciando...' : 'Nova Tentativa'}
        </button>
      </div>

      {loading && <LoadingOverlay message="Reiniciando..." />}
    </div>
  )
}
