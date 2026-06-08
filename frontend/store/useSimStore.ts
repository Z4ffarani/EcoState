import { create } from 'zustand'
import { GameState } from '@/lib/vectors'

export interface PlatformTooltip {
  id: string
  x: number
  y: number
}

export interface SessionParams {
  name: string
  region: string
  season: string
}

interface SimStore {
  state: GameState | null
  token: string | null
  sessionId: string | null
  connected: boolean
  selectedVector: string | null
  showMenu: boolean
  platformTooltip: PlatformTooltip | null
  sessionParams: SessionParams | null

  setState: (s: GameState) => void
  setToken: (token: string, sessionId: string) => void
  setConnected: (v: boolean) => void
  setSelectedVector: (v: string | null) => void
  toggleMenu: () => void
  setPlatformTooltip: (t: PlatformTooltip | null) => void
  setSessionParams: (p: SessionParams) => void
  reset: () => void
}

export const useSimStore = create<SimStore>((set) => ({
  state: null,
  token: null,
  sessionId: null,
  connected: false,
  selectedVector: null,
  showMenu: false,
  platformTooltip: null,
  sessionParams: null,

  setState: (s) => set({ state: s }),
  setToken: (token, sessionId) => set({ token, sessionId, state: null, connected: false }),
  setConnected: (v) => set({ connected: v }),
  setSelectedVector: (v) => set({ selectedVector: v }),
  toggleMenu: () => set((prev) => ({ showMenu: !prev.showMenu })),
  setPlatformTooltip: (t) => set({ platformTooltip: t }),
  setSessionParams: (p) => set({ sessionParams: p }),
  reset: () => set({ state: null, token: null, sessionId: null, connected: false, platformTooltip: null, sessionParams: null }),
}))
