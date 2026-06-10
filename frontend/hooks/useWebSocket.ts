'use client'
import { useEffect, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useSimStore } from '@/store/useSimStore'
import { GameState } from '@/lib/vectors'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const { token, setConnected, setState } = useSimStore()

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as GameState
        if (!data.session_id) return
        // Skip WS tick while a manual action is in-flight to avoid flashing old values
        if (useSimStore.getState().updating) return
        flushSync(() => setState(data))
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      // Reconnect after 3 seconds if we still have a token
      setTimeout(() => {
        if (useSimStore.getState().token) connect()
      }, 3000)
    }

    ws.onerror = () => ws.close()
  }, [token, setConnected, setState])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  return { send }
}
