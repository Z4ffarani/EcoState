'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useSimStore } from '@/store/useSimStore'
import RestartButton from './RestartButton'
import ExitButton from './ExitButton'
import PauseButton from './PauseButton'
import ScenarioTimer from './ScenarioTimer'
import {
  PLATFORMS, VECTOR_LABELS_PT,
  REGION_PT, VectorKey, MAX_LEVEL, LEVEL_RANKS,
  SPACE_REGIONS, SPACE_ONLY_VECTORS,
  OCEAN_REGIONS, OCEAN_ONLY_VECTORS,
  NEUTRAL, VECTOR_MAX, formatSigned,
} from '@/lib/vectors'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const AMOUNTS = [5, 10, 20]

// Timer duration is keyed only to level (progress stage), not aggravation.
// Aggravation makes the scenario harder but does not change the clock — the
// clock is only shortened when the player advances to the next level.
function scenarioSeconds(level: number): number {
  return level <= 2 ? 60 : level <= 5 ? 45 : level <= 8 ? 30 : 20
}

export default function Sidebar() {
  const sidebarOpen = useSimStore((s) => s.sidebarOpen)
  const setSidebarOpen = useSimStore((s) => s.setSidebarOpen)
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const state = useSimStore((s) => s.state)
  const connected = useSimStore((s) => s.connected)
  const updating = useSimStore((s) => s.updating)
  const setUpdating = useSimStore((s) => s.setUpdating)
  const paused = useSimStore((s) => s.paused)
  const togglePause = useSimStore((s) => s.togglePause)
  const vectorsModified = useSimStore((s) => s.vectorsModified)
  const setVectorsModified = useSimStore((s) => s.setVectorsModified)
  const token = useSimStore((s) => s.token)
  const setState = useSimStore((s) => s.setState)

  // Submit sends the final client-side distribution to the server.
  const submit = useCallback(async () => {
    const cur = useSimStore.getState().state
    if (!cur || cur.is_victory || useSimStore.getState().updating) return
    setUpdating(true)
    setVectorsModified(false)
    try {
      const payload = {
        vectors: Object.fromEntries(
          Object.entries(cur.vectors).map(([k, v]) => [k, v.value])
        ),
      }
      const res = await fetch(`${API_URL}/session/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (res.ok) setState(await res.json())
    } catch { /* noop */ }
    finally {
      setUpdating(false)
    }
  }, [token, setState, setUpdating])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const s = useSimStore.getState()
      if (!s.state) return
      const ended = !!s.state.is_victory || !!s.state.is_game_over
      if (!ended && !s.updating && !s.paused) submit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submit])

  if (!state) return null

  const budget = state.supply_budget || 1
  const isSpace = SPACE_REGIONS.has(state.region)
  const isOcean = OCEAN_REGIONS.has(state.region)
  const ended = !!state.is_victory || !!state.is_game_over
  const lockedHard = ended || updating          // truly blocked: can't interact at all
  const locked = lockedHard || paused           // softly locked: submit + timer frozen
  const timerSeconds = scenarioSeconds(state.level)

  const spent = Math.round(Object.values(state.vectors).reduce((a, v) => a + Math.abs(v.value - NEUTRAL), 0) / 5) * 5
  const usedPct = Math.min(100, (spent / budget) * 100)

  // A move is allowed only if it keeps total allocation within the budget.
  const moveDelta = (vector: VectorKey, amount: number): number | null => {
    const cur = state.vectors[vector]?.value ?? NEUTRAL
    const next = Math.max(-VECTOR_MAX, Math.min(VECTOR_MAX, cur + amount))
    if (next === cur) return null
    const costDelta = Math.abs(next - NEUTRAL) - Math.abs(cur - NEUTRAL)
    if (spent + costDelta > budget + 1e-6) return null
    return next
  }

  // Client-side only — instant, no server round-trip (vectors are static until submit).
  // Interacting while paused auto-resumes the game.
  const adjustResource = (vector: VectorKey, amount: number) => {
    if (lockedHard) return
    if (paused) togglePause()
    const next = moveDelta(vector, amount)
    if (next === null) return
    setVectorsModified(true)
    setState({
      ...state,
      vectors: { ...state.vectors, [vector]: { ...state.vectors[vector], value: next } },
    })
  }

  const transitionKey = `${state.scenario_id}-${state.level}-${state.aggravation}`
  // Timer resets on every state transition — including aggravation — but duration
  // stays fixed per level (scenarioSeconds ignores aggravation).
  const timerKey = transitionKey

  return (
    <>
      {/* ── Mobile pull tab — toggles open/close, hidden on desktop ── */}
      <button
        className={clsx(
          'lg:hidden fixed top-1/2 -translate-y-1/2 z-50',
          'flex items-center justify-center w-5 h-16',
          'border border-eco-border transition-all duration-300',
          sidebarOpen
            ? 'left-[calc(100vw-2.5rem)] rounded-r-lg border-l-0'
            : 'left-0 rounded-r-lg border-l-0'
        )}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Fechar painel' : 'Abrir painel'}
        style={{ background: '#0a1c29' }}
      >
        <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
          <path
            d={sidebarOpen ? 'M5 1L1 5l4 4' : 'M1 1l4 4-4 4'}
            stroke="#00c8ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* ── Mobile tap-outside-to-close zone ── */}
      <div
        className={clsx(
          'lg:hidden fixed inset-0 z-40 transition-opacity duration-300',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar panel ── */}
      <div
        className={clsx(
          'flex flex-col h-screen border-r border-eco-border overflow-hidden transition-transform duration-300',
          'fixed inset-y-0 left-0 z-50 w-[calc(100vw-2.5rem)]',
          'lg:relative lg:inset-auto lg:w-[432px] lg:shrink-0 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: '#0a1c29' }}
      >
        {/* ── Scrollable body ── */}
        <div
          ref={scrollRef}
          onScroll={() => setScrolled((scrollRef.current?.scrollTop ?? 0) > 24)}
          className="flex-1 overflow-y-auto px-4 pb-3 space-y-3 min-h-0 lg:pb-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >

          {/* ── Header ── */}
          <div className="relative flex items-center justify-center gap-3 pt-4 pb-3 border-b border-eco-border overflow-hidden">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-eco-accent font-bold text-xs border border-eco-accent/40 shrink-0"
              style={{ background: 'rgba(0,200,255,0.08)' }}
            >
              {state.user_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm text-white font-semibold leading-tight">{state.user_name}</div>
              <div className="text-[10px] text-eco-muted">{LEVEL_RANKS[Math.min(state.level, MAX_LEVEL)]}</div>
            </div>
          </div>

          {/* Session actions — equal width */}
          <div className="flex gap-2 min-w-0 overflow-hidden">
            <ExitButton />
            {!vectorsModified && <PauseButton />}
            <RestartButton label="Reiniciar" />
          </div>

          {/* Sticky: loading bar + scenario → submit → supply */}
          <div className="sticky top-0 z-10 -mx-4 px-4 pb-2 pt-3 -mt-3 space-y-2 overflow-hidden" style={{ background: '#0a1c29' }}>
            {/* Submit loading bar — appears while API call is in flight, not on scenario change */}
            <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none">
              <div
                className={clsx('h-full w-2/5', updating ? 'animate-submit-slide' : 'hidden')}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.5), #00c8ff, rgba(0,200,255,0.5), transparent)' }}
              />
            </div>
            {/* Scenario box + submit + points — collapses while paused */}
            <div className={clsx(
              'grid transition-all duration-300',
              paused ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            )}>
            <div className="overflow-hidden space-y-2">
              {/* Scenario box */}
              <div className="rounded-md border px-3 py-2.5 border-amber-500/40 bg-amber-900/15">
                <div className={clsx('flex items-center gap-2 transition-all duration-300', scrolled ? 'mb-0' : 'mb-1')}>
                  <span className="text-amber-400 text-xs shrink-0">◆</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 truncate">
                    {state.scenario_title}
                  </span>
                </div>
                <div className={clsx('grid transition-all duration-300', scrolled ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100')}>
                  <p className="text-[11px] text-amber-100/85 leading-[1.55] overflow-hidden">{state.scenario_text}</p>
                </div>
                {state.aggravation > 0 && state.scenario_hint && (
                  <p className="mt-1.5 text-[10px] text-cyan-300/80 leading-[1.55] border-t border-amber-500/20 pt-1.5">
                    💡 {state.scenario_hint}
                  </p>
                )}
              </div>

              {/* Submit button — slides in after first vector interaction */}
              <div className={clsx(
                'grid transition-all duration-300',
                vectorsModified ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              )}>
                <div className="overflow-hidden">
                  <button
                    onClick={submit}
                    disabled={locked}
                    className={clsx(
                      'w-full py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all',
                      'border border-eco-accent text-eco-accent hover:bg-eco-accent hover:text-eco-bg',
                      'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-eco-accent'
                    )}
                  >
                    {updating ? 'Processando…' : 'Submeter distribuição (Enter)'}
                  </button>
                </div>
              </div>

              {/* Distribution points box — always fully visible */}
              <div className="rounded-md border border-eco-border bg-eco-bg/40 px-3 py-3">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-[10px] text-eco-muted uppercase tracking-wider">Pontos de distribuição</span>
                  <span className="text-xs font-mono font-bold text-eco-accent">{spent} / {budget}</span>
                </div>
                <div className="w-full h-1.5 bg-eco-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-[1200ms] ease-out bg-eco-accent"
                    style={{ width: `${usedPct}%` }} />
                </div>
                <div className={clsx('grid transition-all duration-300', scrolled ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100')}>
                  <p className="text-[10px] text-eco-muted leading-[1.6] pt-2 overflow-hidden">
                    Distribua os pontos entre os vetores. Redistribua à vontade até submeter.
                  </p>
                </div>
              </div>
            </div>
            </div>

            {/* Scenario countdown — shrinks with difficulty; frozen while paused; auto-submits at zero */}
            <div className="pb-3">
              <ScenarioTimer
                seconds={timerSeconds}
                resetKey={timerKey}
                active={!locked}
                onExpire={submit}
              />
            </div>
          </div>

          {/* Region */}
          <div className="flex items-center justify-between px-0.5 text-[10px] text-eco-muted/70">
            <span>{REGION_PT[state.region] ?? state.region}</span>
            <span>Cenário #{state.scenario_index + 1}</span>
          </div>

          {/* ── Platforms ── */}
          {PLATFORMS.map((platform, pIdx) => {
            const vecs = platform.vectors
              .filter((vKey) => !SPACE_ONLY_VECTORS.has(vKey) || isSpace)
              .filter((vKey) => !OCEAN_ONLY_VECTORS.has(vKey) || isOcean)
              .map((vKey) => ({ vKey, v: state.vectors[vKey] }))
              .filter(({ v }) => !!v)

            if (!vecs.length) return null

            return (
              <section key={platform.id} className={clsx(pIdx > 0 && 'border-t border-eco-border pt-3')}>
                {/* Platform header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: platform.color }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: platform.color }}>
                    {platform.label}
                  </span>
                </div>

                {/* Adjustable vector rows */}
                {vecs.map(({ vKey, v }) => {
                  // Center-out bar: dot at center (0), extends left (red) for negative,
                  // right (green) for positive. Half-fill width = |value| / max of each half.
                  const fillPct = (Math.abs(v.value) / VECTOR_MAX) * 50
                  const positive = v.value > 0.5
                  const negative = v.value < -0.5
                  const numColor = positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-eco-accent'
                  return (
                  <div key={vKey} className="py-[3px]">
                    {/* Label + bar(desktop)/value(mobile) row */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-eco-muted shrink-0 truncate flex-1 lg:flex-none lg:w-[90px]">
                        {VECTOR_LABELS_PT[vKey] || v.label}
                      </span>
                      {/* Bar inline — desktop only */}
                      <div className="relative flex-1 h-1.5 bg-eco-border rounded-full overflow-hidden hidden lg:block">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-eco-muted/30" />
                        {positive && <div className="absolute left-1/2 top-0 bottom-0 bg-green-500/80 transition-all duration-[600ms] ease-out" style={{ width: `${fillPct}%` }} />}
                        {negative && <div className="absolute right-1/2 top-0 bottom-0 bg-red-500/80 transition-all duration-[600ms] ease-out" style={{ width: `${fillPct}%` }} />}
                        <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-eco-accent" />
                      </div>
                      <span className={clsx('text-[10px] font-mono font-bold w-8 text-right shrink-0', numColor)}>
                        {formatSigned(v.value)}
                      </span>
                    </div>

                    {/* Bar full-width — mobile only */}
                    <div className="relative h-1.5 bg-eco-border rounded-full overflow-hidden mt-1 lg:hidden">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-eco-muted/30" />
                      {positive && <div className="absolute left-1/2 top-0 bottom-0 bg-green-500/80 transition-all duration-[600ms] ease-out" style={{ width: `${fillPct}%` }} />}
                      {negative && <div className="absolute right-1/2 top-0 bottom-0 bg-red-500/80 transition-all duration-[600ms] ease-out" style={{ width: `${fillPct}%` }} />}
                      <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-eco-accent" />
                    </div>

                    {/* +/- controls — instant & client-side; clicking while paused auto-resumes */}
                    <div className={clsx('flex items-center gap-1 mt-1 mb-0.5 lg:pl-[94px] transition-opacity duration-300', lockedHard && 'opacity-40')}>
                      {AMOUNTS.slice().reverse().map((amt) => (
                        <button key={`-${amt}`}
                          onClick={() => adjustResource(vKey, -amt)}
                          disabled={lockedHard || moveDelta(vKey, -amt) === null}
                          className="flex-1 text-[10px] py-0.5 rounded border border-red-800/50 text-red-400/70 hover:border-red-500/70 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                          −{amt}
                        </button>
                      ))}
                      {AMOUNTS.map((amt) => (
                        <button key={`+${amt}`}
                          onClick={() => adjustResource(vKey, amt)}
                          disabled={lockedHard || moveDelta(vKey, amt) === null}
                          className="flex-1 text-[10px] py-0.5 rounded border border-eco-border text-eco-muted hover:border-eco-accent hover:text-eco-accent transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                          +{amt}
                        </button>
                      ))}
                    </div>
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
