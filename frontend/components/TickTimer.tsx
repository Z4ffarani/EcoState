'use client'
import { useEffect, useState } from 'react'
import { useSimStore } from '@/store/useSimStore'
import clsx from 'clsx'

const TICK_SEC = 5
const R = 11
const CIRC = 2 * Math.PI * R

interface Props {
  className?: string
  compact?: boolean
}

export default function TickTimer({ className, compact }: Props) {
  const tick = useSimStore((s) => s.state?.tick ?? 0)
  const connected = useSimStore((s) => s.connected)
  const [sec, setSec] = useState(TICK_SEC)

  useEffect(() => {
    const start = Date.now()
    setSec(TICK_SEC)
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      setSec(Math.max(0, TICK_SEC - elapsed))
    }, 80)
    return () => clearInterval(id)
  }, [tick])

  const waiting = sec <= 0.05
  const fraction = sec / TICK_SEC
  const color = waiting ? '#f59e0b' : fraction > 0.5 ? '#00c8ff' : fraction > 0.25 ? '#f59e0b' : '#ef4444'
  const dash = CIRC * fraction

  if (!connected) return null

  if (compact) {
    return waiting ? (
      <div
        className="w-6 h-6 rounded-full border-2 animate-spin shrink-0"
        style={{ borderColor: '#0d2535', borderTopColor: '#f59e0b' }}
      />
    ) : (
      <svg width="24" height="24" viewBox="0 0 28 28" className="shrink-0 -rotate-90">
        <circle cx="14" cy="14" r={R} fill="none" stroke="#0d2535" strokeWidth="2.5" />
        <circle
          cx="14" cy="14" r={R}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          style={{ transition: 'stroke-dasharray 0.08s linear, stroke 0.3s' }}
        />
      </svg>
    )
  }

  return (
    <div className={clsx('eco-panel flex items-center gap-3 px-4 py-2', className)}>
      {waiting ? (
        /* Border-spinner — no SVG transform conflict */
        <div
          className="w-7 h-7 rounded-full border-2 animate-spin shrink-0"
          style={{ borderColor: '#0d2535', borderTopColor: '#f59e0b' }}
        />
      ) : (
        /* Countdown arc */
        <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0 -rotate-90">
          <circle cx="14" cy="14" r={R} fill="none" stroke="#0d2535" strokeWidth="2.5" />
          <circle
            cx="14" cy="14" r={R}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{ transition: 'stroke-dasharray 0.08s linear, stroke 0.3s' }}
          />
        </svg>
      )}
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {waiting ? 'aguardando...' : `${sec.toFixed(1)}s`}
        </span>
        <span className="text-[10px] text-eco-muted">próx. TIC · turno {tick}</span>
      </div>
    </div>
  )
}
