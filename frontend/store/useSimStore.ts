import { create } from 'zustand'
import { GameState } from '@/lib/vectors'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface PlatformTooltip {
  id: string
  x: number
  y: number
}

export interface SessionParams {
  name: string
  region: string
}

interface SimStore {
  state: GameState | null
  token: string | null
  sessionId: string | null
  connected: boolean
  updating: boolean
  paused: boolean
  pausesUsed: number
  vectorsModified: boolean
  sidebarOpen: boolean
  selectedVector: string | null
  showMenu: boolean
  platformTooltip: PlatformTooltip | null
  platformModal: string | null
  sessionParams: SessionParams | null

  setState: (s: GameState) => void
  setToken: (token: string, sessionId: string) => void
  setConnected: (v: boolean) => void
  setUpdating: (v: boolean) => void
  togglePause: () => void
  pausesRemaining: () => number
  setVectorsModified: (v: boolean) => void
  setSidebarOpen: (v: boolean) => void
  setSelectedVector: (v: string | null) => void
  toggleMenu: () => void
  setPlatformTooltip: (t: PlatformTooltip | null) => void
  setPlatformModal: (id: string | null) => void
  setSessionParams: (p: SessionParams) => void
  submitVectors: () => Promise<void>
  reset: () => void
}

export const useSimStore = create<SimStore>((set, get) => ({
  state: null,
  token: null,
  sessionId: null,
  connected: false,
  updating: false,
  paused: false,
  pausesUsed: 0,
  vectorsModified: false,
  sidebarOpen: false,
  selectedVector: null,
  showMenu: true,
  platformTooltip: null,
  platformModal: null,
  sessionParams: null,

  setState: (s) => set({ state: s }),
  setToken: (token, sessionId) => set({ token, sessionId, state: null, connected: false, paused: false, vectorsModified: false }),
  setConnected: (v) => set({ connected: v }),
  setUpdating: (v) => set({ updating: v }),
  togglePause: () => set((prev) => ({
    paused: !prev.paused,
    pausesUsed: !prev.paused ? prev.pausesUsed + 1 : prev.pausesUsed,
  })),
  pausesRemaining: () => Math.max(0, 3 - get().pausesUsed),
  setVectorsModified: (v) => set({ vectorsModified: v }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setSelectedVector: (v) => set({ selectedVector: v }),
  toggleMenu: () => set((prev) => ({ showMenu: !prev.showMenu })),
  setPlatformTooltip: (t) => set({ platformTooltip: t }),
  setPlatformModal: (id) => set({ platformModal: id }),
  setSessionParams: (p) => set({ sessionParams: p }),
  submitVectors: async () => {
    const { state, token, updating } = get()
    if (!state || state.is_victory || updating) return
    set({ updating: true, vectorsModified: false })
    try {
      const payload = {
        vectors: Object.fromEntries(
          Object.entries(state.vectors).map(([k, v]) => [k, v.value])
        ),
      }
      const res = await fetch(`${API_URL}/session/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (res.ok) set({ state: await res.json() })
    } catch { /* noop */ }
    finally { set({ updating: false }) }
  },
  reset: () => set({ state: null, token: null, sessionId: null, connected: false, updating: false, paused: false, pausesUsed: 0, vectorsModified: false, sidebarOpen: false, platformTooltip: null, platformModal: null, sessionParams: null }),
}))
