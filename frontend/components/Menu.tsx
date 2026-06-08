'use client'
import { useSimStore } from '@/store/useSimStore'
import { PLATFORMS, INVERSE_VECTORS, VECTOR_LABELS_PT, VectorKey } from '@/lib/vectors'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const AMOUNTS = [5, 10, 20]
const SUPPLY_CAP = 300

export default function Menu() {
  const showMenu = useSimStore((s) => s.showMenu)
  const toggleMenu = useSimStore((s) => s.toggleMenu)
  const token = useSimStore((s) => s.token)
  const state = useSimStore((s) => s.state)
  const setState = useSimStore((s) => s.setState)

  // Fall back to 80 if supply_pool missing (session created before this feature)
  const supply = state?.supply_pool ?? 80

  // cost=0 for malicious vectors (they never spend supply)
  const adjustResource = async (vector: VectorKey, amount: number, cost: number) => {
    if (cost > 0 && supply < cost) return

    if (state) {
      const current = state.vectors[vector]?.value ?? 0
      setState({
        ...state,
        supply_pool: Math.max(0, supply - cost),
        vectors: {
          ...state.vectors,
          [vector]: { ...state.vectors[vector], value: Math.max(0, Math.min(100, current + amount)) },
        },
      })
    }

    try {
      const res = await fetch(`${API_URL}/session/resource`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vector, amount }),
      })
      if (res.ok) setState(await res.json())
    } catch { /* noop */ }
  }

  const gameEnded = !!state?.is_game_over || !!state?.is_victory

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={toggleMenu}
        className="eco-panel absolute bottom-4 left-4 z-20 w-10 h-10 flex flex-col items-center justify-center gap-1 hover:border-eco-accent/60 transition-colors"
      >
        <span className={clsx('w-4 h-0.5 bg-eco-accent transition-all', showMenu && 'rotate-45 translate-y-1.5')} />
        <span className={clsx('w-4 h-0.5 bg-eco-accent transition-all', showMenu && 'opacity-0')} />
        <span className={clsx('w-4 h-0.5 bg-eco-accent transition-all', showMenu && '-rotate-45 -translate-y-1.5')} />
      </button>

      {showMenu && (
        <div className="eco-panel absolute bottom-20 left-4 z-20 w-80 p-3 max-h-[70vh] overflow-y-auto">
          <span className="text-xs font-bold text-eco-accent tracking-widest uppercase">Gerenciador de Recursos</span>

          {/* Reserva de suprimentos */}
          <div className="mt-2 mb-3 p-2 rounded border border-eco-border bg-eco-bg/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-eco-muted">Reserva de Suprimentos</span>
              <span className={clsx(
                'text-xs font-mono font-bold',
                supply > 60 ? 'text-eco-accent' : supply > 20 ? 'text-amber-400' : 'text-red-400'
              )}>
                {Math.floor(supply)} / {SUPPLY_CAP}
              </span>
            </div>
            <div className="w-full h-2 bg-eco-border rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  supply > 60 ? 'bg-eco-accent' : supply > 20 ? 'bg-amber-400' : 'bg-red-500'
                )}
                style={{ width: `${(supply / SUPPLY_CAP) * 100}%` }}
              />
            </div>
            <div className="mt-1.5">
              <p className="text-[10px] text-eco-muted leading-[1.5]">
                Cada ação em vetor benéfico consome supply igual ao valor (±5, ±10 ou ±20). Vetores maliciosos são sempre gratuitos. Regenera +3–7 por turno.
              </p>
            </div>
          </div>

          {/* ─────── Vetores Benéficos ─────── */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-semibold text-eco-accent/70 tracking-widest uppercase">↑ Benéficos</span>
            <span className="text-eco-border/60">·</span>
            <span className="text-[10px] text-eco-muted">custa supply</span>
          </div>

          {PLATFORMS.map((platform) => {
            const vecs = platform.vectors.filter((v) => !INVERSE_VECTORS.has(v))
            if (!vecs.length) return null
            return (
              <div key={platform.id} className="mb-3">
                <div className="text-[11px] font-semibold mb-1.5" style={{ color: platform.color }}>
                  {platform.label}
                </div>
                {vecs.map((vKey) => {
                  const v = state?.vectors[vKey]
                  if (!v) return null
                  const health = vKey === 'temperature'
                    ? Math.max(0, 1 - Math.abs(v.value - 50) / 50)
                    : v.value / 100
                  const valColor = health > 0.65 ? '#4ade80' : health > 0.35 ? '#fbbf24' : '#f87171'
                  return (
                    <div key={vKey} className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-eco-muted">{VECTOR_LABELS_PT[vKey] || v.label}</span>
                        <span className="text-[11px] font-mono font-bold" style={{ color: valColor }}>
                          {Math.round(v.value)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {AMOUNTS.map((amt) => (
                          <button
                            key={`-${amt}`}
                            onClick={() => adjustResource(vKey, -amt, amt)}
                            disabled={gameEnded || supply < amt}
                            title={supply < amt ? `Precisa de ${amt} supply` : undefined}
                            className="flex-1 text-[10px] py-0.5 rounded border border-red-800/50 text-red-400/60 hover:border-red-500/70 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            -{amt}
                          </button>
                        ))}
                        {AMOUNTS.map((amt) => (
                          <button
                            key={`+${amt}`}
                            onClick={() => adjustResource(vKey, amt, amt)}
                            disabled={gameEnded || supply < amt}
                            title={supply < amt ? `Precisa de ${amt} supply` : undefined}
                            className="flex-1 text-[10px] py-0.5 rounded border border-eco-border text-eco-muted hover:border-eco-accent hover:text-eco-accent transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* ─────── Vetores Maliciosos ─────── */}
          <div className="flex items-center gap-1.5 mb-2 border-t border-eco-border pt-3 mt-1">
            <span className="text-[10px] font-semibold text-amber-500/70 tracking-widest uppercase">↓ Maliciosos</span>
            <span className="text-eco-border/60">·</span>
            <span className="text-[10px] text-green-400/70">sem custo</span>
          </div>

          {PLATFORMS.flatMap((platform) =>
            platform.vectors
              .filter((v) => INVERSE_VECTORS.has(v))
              .map((vKey) => {
                const v = state?.vectors[vKey]
                if (!v) return null
                const health = 1 - v.value / 100
                const valColor = health > 0.65 ? '#4ade80' : health > 0.35 ? '#fbbf24' : '#f87171'
                return (
                  <div key={vKey} className="mb-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] text-eco-muted">{VECTOR_LABELS_PT[vKey] || v.label}</span>
                      <span className="text-[10px] text-eco-muted/40">({platform.label})</span>
                      <span className="ml-auto text-[11px] font-mono font-bold" style={{ color: valColor }}>
                        {Math.round(v.value)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {AMOUNTS.map((amt) => (
                        <button
                          key={`-${amt}`}
                          onClick={() => adjustResource(vKey, -amt, 0)}
                          disabled={gameEnded}
                          className="flex-1 text-[10px] py-0.5 rounded border border-red-800/50 text-red-400/60 hover:border-red-500/70 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          -{amt}
                        </button>
                      ))}
                      {AMOUNTS.map((amt) => (
                        <button
                          key={`+${amt}`}
                          onClick={() => adjustResource(vKey, amt, 0)}
                          disabled={gameEnded}
                          className="flex-1 text-[10px] py-0.5 rounded border border-eco-border text-eco-muted hover:border-amber-500/60 hover:text-amber-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })
          )}
        </div>
      )}
    </>
  )
}
