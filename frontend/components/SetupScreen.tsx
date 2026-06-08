'use client'
import { useState } from 'react'
import { REGIONS, SEASONS } from '@/lib/vectors'
import { useSimStore } from '@/store/useSimStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Props {
  onStart: (token: string, sessionId: string) => void
}

export default function SetupScreen({ onStart }: Props) {
  const [name, setName] = useState('Armstrong')
  const [region, setRegion] = useState('tropical')
  const [season, setSeason] = useState('spring')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setSessionParams = useSimStore((s) => s.setSessionParams)

  const handleStart = async () => {
    setLoading(true)
    setError('')
    const resolvedName = name.trim() || 'Armstrong'
    try {
      const res = await fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: resolvedName, region, season }),
      })
      if (!res.ok) throw new Error('Falha ao criar sessão')
      const data = await res.json()
      setSessionParams({ name: resolvedName, region, season })
      onStart(data.token, data.session_id)
    } catch {
      setError('Não foi possível conectar ao servidor. O backend está em execução?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-eco-bg">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(#1a3a52 1px, transparent 1px), linear-gradient(90deg, #1a3a52 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="eco-panel relative z-10 p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/full-logo.png" alt="EcoState" className="mx-auto max-h-12 max-w-full w-auto" />
          <div className="text-xs text-eco-muted mt-2 tracking-widest uppercase">
            Seu Estado do Futuro
          </div>
        </div>

        <div className="space-y-5">
          {/* Nome do operador */}
          <div>
            <label className="text-xs text-eco-muted uppercase tracking-wider mb-1 block">
              Nome do Operador
            </label>
            <input
              className="w-full bg-eco-bg border border-eco-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-eco-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
            />
          </div>

          {/* Região */}
          <div>
            <label className="text-xs text-eco-muted uppercase tracking-wider mb-1 block">
              Região
            </label>
            <div className="grid grid-cols-3 gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRegion(r.id)}
                  className={`py-2 rounded border text-xs transition-all ${
                    region === r.id
                      ? 'border-eco-accent text-eco-accent bg-eco-accent/10'
                      : 'border-eco-border text-eco-muted hover:border-eco-muted'
                  }`}
                >
                  <span className="block text-base mb-0.5">{r.emoji}</span>
                  {r.label}
                </button>
              ))}
            </div>
            {(() => {
              const r = REGIONS.find((r) => r.id === region)
              return r ? (
                <p className="mt-2 text-[10px] text-eco-muted/80 leading-relaxed pl-0.5">{r.desc}</p>
              ) : null
            })()}
          </div>

          {/* Estado (oculto para regiões espaciais) */}
          {!['moon', 'mars'].includes(region) && (
            <div>
              <label className="text-xs text-eco-muted uppercase tracking-wider mb-1 block">
                Estado do Ano
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SEASONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSeason(s.id)}
                    className={`py-2 rounded border text-xs transition-all ${
                      season === s.id
                        ? 'border-eco-accent text-eco-accent bg-eco-accent/10'
                        : 'border-eco-border text-eco-muted hover:border-eco-muted'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {(() => {
                const s = SEASONS.find((s) => s.id === season)
                return s ? (
                  <p className="mt-2 text-[10px] text-eco-muted/80 leading-relaxed pl-0.5">{s.desc}</p>
                ) : null
              })()}
            </div>
          )}

          {error && <div className="text-xs text-red-400 text-center">{error}</div>}

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-3 rounded border border-eco-accent text-eco-accent font-bold tracking-widest uppercase text-sm hover:bg-eco-accent hover:text-eco-bg transition-all disabled:opacity-50"
          >
            {loading ? 'Inicializando...' : 'Iniciar Estado'}
          </button>
        </div>
      </div>
    </div>
  )
}
