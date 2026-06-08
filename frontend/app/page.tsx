'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useSimStore } from '@/store/useSimStore'
import { PLATFORMS, VECTOR_LABELS_PT } from '@/lib/vectors'
import { useWebSocket } from '@/hooks/useWebSocket'
import ProgressBar from '@/components/ProgressBar'
import SetupScreen from '@/components/SetupScreen'
import SceneErrorBoundary from '@/components/SceneErrorBoundary'
import Sidebar from '@/components/Sidebar'
import VictoryModal from '@/components/VictoryModal'

const SimulatorScene = dynamic(() => import('@/components/SimulatorScene'), { ssr: false })

function PlatformTooltip() {
  const tooltip = useSimStore((s) => s.platformTooltip)
  const state = useSimStore((s) => s.state)
  if (!tooltip || !state) return null

  const platform = PLATFORMS.find((p) => p.id === tooltip.id)
  if (!platform) return null

  return (
    <div
      className="fixed z-50 pointer-events-none eco-panel px-3 py-2"
      style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
    >
      <div className="text-xs font-bold mb-1" style={{ color: platform.color }}>{platform.label}</div>
      <div className="space-y-0.5">
        {platform.vectors.map((vKey) => {
          const v = state.vectors[vKey]
          if (!v) return null
          return (
            <div key={vKey} className="text-[10px] text-eco-muted flex items-center gap-1.5">
              <span>{VECTOR_LABELS_PT[vKey] || vKey}</span>
              <span className="font-mono text-white">{Math.round(v.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SimulatorView() {
  useWebSocket()
  return (
    <div className="flex w-screen h-screen overflow-hidden">
      {/* ── Left sidebar ── */}
      <Sidebar />

      {/* ── Right: 3D scene ── */}
      <div className="flex-1 relative overflow-hidden">
        <SceneErrorBoundary>
          <SimulatorScene />
        </SceneErrorBoundary>

        {/* Logo watermark — top center of 3D area */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <img src="/full-logo.png" alt="" className="max-h-9 w-auto max-w-[50vw]" style={{ opacity: 0.3 }} />
        </div>

        <ProgressBar />
        <PlatformTooltip />
      </div>
      <VictoryModal />
    </div>
  )
}

export default function Home() {
  const token = useSimStore((s) => s.token)
  const setToken = useSimStore((s) => s.setToken)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [overlayOpaque, setOverlayOpaque] = useState(false)

  useEffect(() => {
    if (!token) { setOverlayVisible(false); setOverlayOpaque(false); return }
    setOverlayVisible(true)
    setOverlayOpaque(true)
    const t1 = setTimeout(() => setOverlayOpaque(false), 900)
    const t2 = setTimeout(() => setOverlayVisible(false), 1450)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [token])

  if (!token) {
    return <SetupScreen onStart={(t, s) => setToken(t, s)} />
  }

  return (
    <>
      <SimulatorView />
      {overlayVisible && (
        <div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-5 pointer-events-none transition-opacity duration-500"
          style={{ background: '#080f16', opacity: overlayOpaque ? 1 : 0 }}
        >
          <img
            src="/full-logo.png"
            alt="EcoState"
            style={{ maxHeight: 48, width: 'auto', maxWidth: '60vw', opacity: 0.9 }}
          />
          <div
            className="animate-spin rounded-full"
            style={{ width: 28, height: 28, border: '2px solid rgba(0,200,255,0.15)', borderTopColor: '#00c8ff' }}
          />
        </div>
      )}
    </>
  )
}
