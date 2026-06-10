'use client'
import { useSimStore } from '@/store/useSimStore'
import clsx from 'clsx'

const MAX_PAUSES = 3

export default function PauseButton() {
  const state = useSimStore((s) => s.state)
  const paused = useSimStore((s) => s.paused)
  const pausesUsed = useSimStore((s) => s.pausesUsed)
  const togglePause = useSimStore((s) => s.togglePause)
  const updating = useSimStore((s) => s.updating)

  const ended = !!state?.is_victory || !!state?.is_game_over
  const disabled = ended || updating
  const remaining = MAX_PAUSES - pausesUsed

  // Hide the button once the limit is reached — unless the player is currently
  // paused (they still need to be able to resume).
  if (remaining <= 0 && !paused) return null

  return (
    <button
      onClick={() => { if (!disabled) togglePause() }}
      disabled={disabled}
      title={paused ? 'Retomar' : `Pausar (${remaining} restante${remaining !== 1 ? 's' : ''})`}
      className={clsx(
        'eco-panel flex flex-1 min-w-0 items-center justify-center gap-2 px-3 py-2 transition-colors disabled:opacity-50',
        paused
          ? 'text-eco-accent border-eco-accent/40'
          : 'text-eco-muted hover:text-eco-accent hover:border-eco-accent/40'
      )}
    >
      {paused ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="shrink-0">
          <path d="M2.5 1.5l7 4.5-7 4.5z" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="shrink-0">
          <rect x="2" y="1.5" width="3" height="9" rx="0.5" />
          <rect x="7" y="1.5" width="3" height="9" rx="0.5" />
        </svg>
      )}
      <span className="hidden sm:inline text-xs font-medium tracking-wide truncate">
        {paused ? 'Retomar' : `Pausar (${remaining})`}
      </span>
    </button>
  )
}
