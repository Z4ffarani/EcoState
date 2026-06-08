'use client'

interface Props {
  message?: string
}

export default function LoadingOverlay({ message = 'Aguarde...' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
      style={{ background: 'rgba(5, 14, 20, 0.88)', backdropFilter: 'blur(4px)' }}
    >
      {/* Spinning ring */}
      <div
        className="w-14 h-14 rounded-full border-2 animate-spin"
        style={{ borderColor: '#0d2535', borderTopColor: '#00c8ff' }}
      />

      {/* Label */}
      <span className="text-sm text-eco-muted tracking-widest uppercase">{message}</span>

      {/* Skeleton lines */}
      <div className="w-56 space-y-2 mt-1">
        <div className="h-2 rounded-full animate-pulse" style={{ background: '#0d2535' }} />
        <div className="h-2 rounded-full animate-pulse w-4/5" style={{ background: '#0d2535' }} />
        <div className="h-2 rounded-full animate-pulse w-3/5" style={{ background: '#0d2535' }} />
      </div>
    </div>
  )
}
