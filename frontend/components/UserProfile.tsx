'use client'
import { useSimStore } from '@/store/useSimStore'

export default function UserProfile() {
  const state = useSimStore((s) => s.state)
  if (!state) return null

  const initials = state.user_name.slice(0, 2).toUpperCase()

  return (
    <div className="eco-panel flex items-center gap-3 px-3 py-2">
      <div className="w-9 h-9 rounded-full bg-eco-border flex items-center justify-center text-eco-accent font-bold text-xs border border-eco-accent/40 shrink-0">
        {initials}
      </div>
      <div>
        <div className="text-sm text-white font-semibold leading-tight">{state.user_name}</div>
        <div className="text-[10px] text-eco-muted">Operador EcoState</div>
      </div>
    </div>
  )
}
