'use client'
import { Component, ReactNode } from 'react'

interface State { error: Error | null }

export default class SceneErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-eco-bg z-50">
          <div className="eco-panel p-6 max-w-md text-center">
            <div className="text-red-400 text-sm font-bold mb-2">Erro na Cena 3D</div>
            <div className="text-eco-muted text-xs font-mono break-all">
              {this.state.error.message}
            </div>
            <button
              className="mt-4 text-xs border border-eco-border px-3 py-1 rounded hover:border-eco-accent text-eco-muted hover:text-eco-accent"
              onClick={() => this.setState({ error: null })}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
