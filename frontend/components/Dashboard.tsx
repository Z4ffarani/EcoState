'use client'
import { useSimStore } from '@/store/useSimStore'
import { INVERSE_VECTORS, REGION_PT, SEASON_PT, VECTOR_LABELS_PT, EVENT_NAMES_PT, trendArrow, VectorKey } from '@/lib/vectors'
import clsx from 'clsx'

function VectorRow({ name, label, value, trend, critical }: {
  name: string; label: string; value: number; trend: number; critical: boolean; unit: string
}) {
  const isInverse = INVERSE_VECTORS.has(name as VectorKey)
  const health = isInverse ? 1 - value / 100 : value / 100
  const barColor = health > 0.65 ? 'bg-green-400' : health > 0.35 ? 'bg-amber-400' : 'bg-red-500'
  const textColor = health > 0.65 ? 'text-green-400' : health > 0.35 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className={clsx('flex items-center gap-2 py-[3px]', critical && 'eco-critical')}>
      <span className="text-[11px] text-eco-muted w-[92px] shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-eco-border rounded-full overflow-hidden min-w-0">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${Math.max(2, value)}%` }}
        />
      </div>
      <span className={clsx('text-xs font-bold font-mono w-9 text-right shrink-0', textColor)}>
        {Math.round(value)}
      </span>
      <span className={clsx(
        'text-xs w-3 text-center shrink-0',
        trend > 0.5 ? 'text-green-400' : trend < -0.5 ? 'text-red-400' : 'text-eco-muted'
      )}>
        {trendArrow(trend)}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const state = useSimStore((s) => s.state)
  const connected = useSimStore((s) => s.connected)

  if (!state) return null

  const vectors = Object.entries(state.vectors)

  return (
    <div className="eco-panel absolute top-4 right-4 w-80 p-4 z-10">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold text-eco-accent tracking-widest uppercase">Vetores ao Vivo</span>
        <span className={clsx('text-xs', connected ? 'text-green-400 animate-blink' : 'text-red-400')}>
          {connected ? '● AO VIVO' : '○ OFFLINE'}
        </span>
      </div>

      {state.active_events.length > 0 && (
        <div className="mb-2.5 bg-red-900/30 border border-red-700/50 rounded px-2.5 py-1.5">
          {state.active_events.map((e) => (
            <div key={e.id} className="text-xs text-red-400 eco-critical">
              ⚠ {EVENT_NAMES_PT[e.name] ?? e.name} ({e.ticks_remaining} turnos)
            </div>
          ))}
        </div>
      )}

      {/* Vetores benéficos */}
      <div className="text-[10px] font-semibold text-eco-accent/60 tracking-widest uppercase mb-1">
        ↑ Benéficos — manter alto
      </div>
      <div className="mb-3">
        {vectors
          .filter(([key]) => !INVERSE_VECTORS.has(key as VectorKey))
          .map(([key, v]) => (
            <VectorRow key={key} name={key} label={VECTOR_LABELS_PT[key as VectorKey] || v.label} value={v.value} trend={v.trend} critical={v.critical} unit={v.unit} />
          ))}
      </div>

      {/* Vetores maliciosos */}
      <div className="text-[10px] font-semibold text-amber-500/70 tracking-widest uppercase mb-1">
        ↓ Maliciosos — manter baixo
      </div>
      <div>
        {vectors
          .filter(([key]) => INVERSE_VECTORS.has(key as VectorKey))
          .map(([key, v]) => (
            <VectorRow key={key} name={key} label={VECTOR_LABELS_PT[key as VectorKey] || v.label} value={v.value} trend={v.trend} critical={v.critical} unit={v.unit} />
          ))}
      </div>

      <div className="mt-2.5 pt-2 border-t border-eco-border space-y-1.5">
        {/* Reserva de suprimentos */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-eco-muted shrink-0">Suprimentos</span>
          <div className="flex-1 h-1.5 bg-eco-border rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                (state.supply_pool ?? 0) > 60 ? 'bg-eco-accent' :
                (state.supply_pool ?? 0) > 20 ? 'bg-amber-400' : 'bg-red-500'
              )}
              style={{ width: `${((state.supply_pool ?? 0) / 300) * 100}%` }}
            />
          </div>
          <span className={clsx(
            'text-[11px] font-mono font-bold shrink-0',
            (state.supply_pool ?? 0) > 60 ? 'text-eco-accent' :
            (state.supply_pool ?? 0) > 20 ? 'text-amber-400' : 'text-red-400'
          )}>
            {Math.floor(state.supply_pool ?? 0)}
          </span>
        </div>

        <div className="text-[11px] text-eco-muted flex justify-between items-center">
          <span>{REGION_PT[state.region] ?? state.region} / {SEASON_PT[state.season] ?? state.season}</span>
          <span>⟳ 5s · turno {state.tick}</span>
        </div>
      </div>
    </div>
  )
}
