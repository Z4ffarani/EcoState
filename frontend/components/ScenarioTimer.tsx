'use client'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

interface Props {
  seconds: number
  resetKey: string      // changing this restarts the countdown
  active: boolean       // counts down only while true (paused/ended -> frozen)
  onExpire: () => void
}

export default function ScenarioTimer({ seconds, resetKey, active, onExpire }: Props) {
  const [left, setLeft] = useState(seconds)
  // Use a ref for onExpire to avoid stale closure in the expiry effect.
  const onExpireRef = useRef(onExpire)
  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  // Restart whenever the scenario/level changes.
  useEffect(() => {
    setLeft(seconds)
  }, [resetKey, seconds])

  // Tick once per second while active.
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [active, resetKey])

  // When time runs out: fire onExpire and restart the cycle.
  // The timer does NOT stop — it loops until the game ends (active becomes false).
  useEffect(() => {
    if (left <= 0) {
      onExpireRef.current()
      setLeft(seconds)
    }
  }, [left, seconds])

  const pct = Math.max(0, Math.min(100, (left / seconds) * 100))
  const color = left > seconds * 0.5 ? '#00c8ff' : left > seconds * 0.25 ? '#f59e0b' : '#ef4444'
  const mm = Math.floor(Math.max(0, left) / 60)
  const ss = String(Math.max(0, left) % 60).padStart(2, '0')

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-eco-muted uppercase tracking-wider">
          {active ? 'Tempo do cenário' : 'Tempo pausado'}
        </span>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {mm}:{ss}
        </span>
      </div>
      <div className="w-full h-1 bg-eco-border rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full', active && 'transition-all duration-1000 ease-linear')}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
