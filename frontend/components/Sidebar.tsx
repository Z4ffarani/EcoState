'use client'
import { useState } from 'react'
import { useSimStore } from '@/store/useSimStore'
import RestartButton from './RestartButton'
import ExitButton from './ExitButton'
import {
  PLATFORMS, INVERSE_VECTORS, VECTOR_LABELS_PT,
  EVENT_NAMES_PT, REGION_PT, SEASON_PT, trendArrow, VectorKey,
} from '@/lib/vectors'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const AMOUNTS = [5, 10, 20]
const SUPPLY_CAP = 300

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const state = useSimStore((s) => s.state)
  const connected = useSimStore((s) => s.connected)
  const showMenu = useSimStore((s) => s.showMenu)
  const toggleMenu = useSimStore((s) => s.toggleMenu)
  const token = useSimStore((s) => s.token)
  const setState = useSimStore((s) => s.setState)
  const tick = state?.tick ?? 0

  if (!state) return null

  const supply = state.supply_pool ?? 80
  const supplyPct = (supply / SUPPLY_CAP) * 100
  const supplyColor = supply > 60 ? 'text-eco-accent' : supply > 20 ? 'text-amber-400' : 'text-red-400'
  const supplyBarColor = supply > 60 ? 'bg-eco-accent' : supply > 20 ? 'bg-amber-400' : 'bg-red-500'
  const gameEnded = !!state.is_game_over || !!state.is_victory

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

  return (
    <>
      {/* ── Mobile hamburger — fixed top-left, hidden on desktop ── */}
      <button
        className={clsx(
          'lg:hidden fixed top-4 left-4 z-50 eco-panel w-9 h-9 flex flex-col items-center justify-center gap-[5px] transition-opacity duration-200',
          mobileOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir painel"
      >
        <span className="w-[14px] h-[1.5px] bg-eco-accent block" />
        <span className="w-[14px] h-[1.5px] bg-eco-accent block" />
        <span className="w-[14px] h-[1.5px] bg-eco-accent block" />
      </button>

      {/* ── Mobile tap-outside-to-close zone (no darkening) ── */}
      <div
        className={clsx(
          'lg:hidden fixed inset-0 z-40 transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Sidebar panel ── */}
      <div
        className={clsx(
          'flex flex-col h-screen border-r border-eco-border overflow-hidden transition-transform duration-300',
          // Mobile: fixed drawer, full-screen width
          'fixed inset-y-0 left-0 z-50 w-full',
          // Desktop: relative (in flow), 360px, always visible
          'lg:relative lg:inset-auto lg:w-[360px] lg:shrink-0 lg:translate-x-0',
          // Mobile open/close via translate
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'rgba(8, 22, 34, 0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* ── Header ── */}
        <div className="relative flex items-center gap-3 px-4 py-3 border-b border-eco-border shrink-0 overflow-hidden">
          {/* Tick sweep bar — restarts on each tick via key */}
          {connected && (
            <div
              key={tick}
              className="animate-header-sweep absolute bottom-0 left-0 h-[2px] w-2/5 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.5), #00c8ff, rgba(0,200,255,0.5), transparent)' }}
            />
          )}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-eco-accent font-bold text-xs border border-eco-accent/40 shrink-0"
            style={{ background: 'rgba(0,200,255,0.08)' }}
          >
            {state.user_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-semibold truncate leading-tight">{state.user_name}</div>
          </div>
          {/* Desktop: hamburger toggles resource adjustments */}
          <button
            className="hidden lg:flex w-8 h-8 flex-col items-center justify-center gap-[5px] shrink-0 rounded hover:bg-white/5 transition-colors"
            onClick={toggleMenu}
            title={showMenu ? 'Monitoramento' : 'Ajustar recursos'}
          >
            <span className={clsx('w-[14px] h-[1.5px] bg-eco-accent block transition-all duration-200', showMenu && 'rotate-45 translate-y-[6.5px]')} />
            <span className={clsx('w-[14px] h-[1.5px] bg-eco-accent block transition-all duration-200', showMenu && 'opacity-0')} />
            <span className={clsx('w-[14px] h-[1.5px] bg-eco-accent block transition-all duration-200', showMenu && '-rotate-45 -translate-y-[6.5px]')} />
          </button>
          {/* Mobile: close button */}
          <button
            className="lg:hidden w-8 h-8 flex items-center justify-center text-eco-muted hover:text-white transition-colors shrink-0"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar painel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 lg:pb-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>

          {/* Active events */}
          {state.active_events.length > 0 && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-md px-3 py-2 space-y-1">
              {state.active_events.map((e) => (
                <div key={e.id} className="flex items-start gap-2 text-xs text-red-400 eco-critical">
                  <span className="shrink-0 mt-[1px]">⚠</span>
                  <span>
                    {EVENT_NAMES_PT[e.name] ?? e.name}
                    <span className="text-red-400/55 ml-1">({e.ticks_remaining} turnos)</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Session actions */}
          <div className="flex gap-2">
            <ExitButton />
            <RestartButton label="Reiniciar" />
          </div>

          {/* Supply bar */}
          <div className="p-3 rounded-md border border-eco-border bg-eco-bg/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-eco-muted uppercase tracking-wider">Reserva de Suprimentos</span>
              <span className={clsx('text-xs font-mono font-bold', supplyColor)}>
                {Math.floor(supply)} / {SUPPLY_CAP}
              </span>
            </div>
            <div className="w-full h-1.5 bg-eco-border rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full transition-all duration-500', supplyBarColor)}
                style={{ width: `${supplyPct}%` }} />
            </div>
            <p className="text-[10px] text-eco-muted leading-[1.6]">
              Ações benéficas custam supply (±5/±10/±20). Maliciosos são gratuitos. Regenera +3–7/turno.
            </p>
          </div>

          {/* Region / tick */}
          <div className="flex items-center justify-between px-0.5 text-[10px] text-eco-muted/70">
            <span>{REGION_PT[state.region] ?? state.region} · {SEASON_PT[state.season] ?? state.season}</span>
            <span>turno {state.tick}</span>
          </div>

          {/* ── Vectors grouped by platform ── */}
          {PLATFORMS.map((platform, pIdx) => {
            const platformVectors = [
              ...platform.vectors.filter((vKey) => !INVERSE_VECTORS.has(vKey)),
              ...platform.vectors.filter((vKey) => INVERSE_VECTORS.has(vKey)),
            ]
              .map((vKey) => ({ vKey, v: state.vectors[vKey] }))
              .filter(({ v }) => !!v)

            if (!platformVectors.length) return null

            return (
              <section key={platform.id} className={clsx(pIdx > 0 && 'border-t border-eco-border pt-3')}>
                {/* Platform header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: platform.color }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: platform.color }}>
                    {platform.label}
                  </span>
                </div>

                {/* Vector rows */}
                {platformVectors.map(({ vKey, v }) => {
                  const isInverse = INVERSE_VECTORS.has(vKey)
                  const health = isInverse
                    ? 1 - v.value / 100
                    : vKey === 'temperature'
                      ? Math.max(0, 1 - Math.abs(v.value - 50) / 50)
                      : v.value / 100
                  const barCls = isInverse
                    ? 'bg-red-500'
                    : health > 0.65 ? 'bg-green-400' : health > 0.35 ? 'bg-amber-400' : 'bg-red-500'
                  const txtCls = isInverse
                    ? 'text-red-400'
                    : health > 0.65 ? 'text-green-400' : health > 0.35 ? 'text-amber-400' : 'text-red-400'
                  const goodTrend = isInverse ? v.trend < -0.5 : v.trend > 0.5
                  const badTrend = isInverse ? v.trend > 0.5 : v.trend < -0.5

                  return (
                    <div key={vKey} className={clsx('py-[3px]', v.critical && 'eco-critical')}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-eco-muted w-[90px] shrink-0 truncate">
                          {VECTOR_LABELS_PT[vKey] || v.label}
                          {isInverse && (
                            <span className="text-amber-500/60 ml-1 text-[9px]">↓</span>
                          )}
                        </span>
                        <div className="flex-1 h-1.5 bg-eco-border rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full transition-all duration-700', barCls)}
                            style={{ width: `${Math.max(2, v.value)}%` }} />
                        </div>
                        <span className={clsx('text-[10px] font-mono font-bold w-8 text-right shrink-0', txtCls)}>
                          {Math.round(v.value)}
                        </span>
                        <span className={clsx('text-[9px] w-3 text-center shrink-0',
                          goodTrend ? 'text-green-400' : badTrend ? 'text-red-400' : 'text-eco-muted/40'
                        )}>
                          {trendArrow(v.trend)}
                        </span>
                      </div>

                      {/* Adjustment buttons — inverse vectors are read-only consequences */}
                      {showMenu && !isInverse && (
                        <div className="flex items-center gap-1 mt-1 mb-0.5 pl-[94px]">
                          {vKey === 'temperature' && AMOUNTS.map((amt) => (
                            <button key={`-${amt}`}
                              onClick={() => adjustResource(vKey, -amt, amt)}
                              disabled={gameEnded || supply < amt}
                              className="flex-1 text-[10px] py-0.5 rounded border border-red-800/50 text-red-400/60 hover:border-red-500/70 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                              -{amt}
                            </button>
                          ))}
                          {AMOUNTS.map((amt) => (
                            <button key={`+${amt}`}
                              onClick={() => adjustResource(vKey, amt, amt)}
                              disabled={gameEnded || supply < amt}
                              title={supply < amt ? `Precisa de ${amt} supply` : undefined}
                              className="flex-1 text-[10px] py-0.5 rounded border border-eco-border text-eco-muted hover:border-eco-accent hover:text-eco-accent transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                              +{amt}
                            </button>
                          ))}
                        </div>
                      )}
                      {showMenu && isInverse && (
                        <div className="pl-[94px] mt-1 mb-0.5">
                          <span className="text-[9px] text-amber-500/50 italic">consequência da simulação</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>
            )
          })}

          <div className="h-20 lg:h-3 shrink-0" />
        </div>
      </div>
    </>
  )
}
