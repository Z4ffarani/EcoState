export type VectorKey =
  | 'water' | 'energy' | 'vegetation' | 'food'
  | 'oxygen' | 'co2' | 'temperature' | 'humidity'
  | 'waste' | 'health' | 'radiation' | 'pressure'
  | 'light' | 'photosynthesis' | 'infrastructure' | 'medical'

export interface VectorState {
  value: number
  trend: number
  critical: boolean
  label: string
  unit: string
}

export interface ActiveEvent {
  id: string
  name: string
  ticks_remaining: number
  effects: Record<string, number>
}

export interface GameState {
  session_id: string
  vectors: Record<VectorKey, VectorState>
  region: string
  season: string
  progress: number
  tick: number
  active_events: ActiveEvent[]
  user_name: string
  is_game_over: boolean
  is_victory: boolean
  message: string | null
  supply_pool: number
}

// Vectors that are better when LOW
export const INVERSE_VECTORS: Set<VectorKey> = new Set(['co2', 'waste', 'radiation'])

export interface PlatformDef {
  id: string
  label: string
  vectors: VectorKey[]
  color: string
  angle: number  // degrees, 0 = right, clockwise
}

export const VECTOR_LABELS_PT: Record<VectorKey, string> = {
  water:         'Água',
  energy:        'Energia',
  vegetation:    'Vegetação',
  food:          'Alimentos',
  oxygen:        'Oxigênio',
  co2:           'CO₂',
  temperature:   'Temperatura',
  humidity:      'Umidade',
  waste:         'Resíduos',
  health:        'Saúde Geral',
  radiation:     'Radiação',
  pressure:      'Pr. Atmosférica',
  light:         'Luminosidade',
  photosynthesis:'Fotossíntese',
  infrastructure: 'Infraestrutura',
  medical:       'Itens Médicos',
}

export const EVENT_NAMES_PT: Record<string, string> = {
  'Drought':           'Seca',
  'Solar Storm':       'Tempestade Solar',
  'Equipment Failure': 'Falha de Equipamento',
  'Air Leak':          'Vazamento de Ar',
  'Epidemic':          'Epidemia',
  'Cold Snap':         'Onda de Frio',
  'Dust Storm':        'Tempestade de Poeira',
  'Algae Bloom':       'Floração de Algas',
  'Waste Overflow':    'Excesso de Resíduos',
}

export const PLATFORMS: PlatformDef[] = [
  { id: 'bio',    label: 'Biosfera',   vectors: ['vegetation', 'food', 'photosynthesis'],          color: '#22c55e', angle: 0   },
  { id: 'hydro',  label: 'Hidrologia', vectors: ['water', 'humidity'],                             color: '#3b82f6', angle: 60  },
  { id: 'power',  label: 'Energia',    vectors: ['energy', 'light'],                               color: '#eab308', angle: 120 },
  { id: 'atmo',   label: 'Atmosfera',  vectors: ['oxygen', 'co2', 'pressure'],                     color: '#06b6d4', angle: 180 },
  { id: 'health', label: 'Saúde',      vectors: ['health', 'medical', 'radiation', 'temperature'], color: '#ef4444', angle: 240 },
  { id: 'tech',   label: 'Tecnologia', vectors: ['infrastructure', 'waste'],                        color: '#f97316', angle: 300 },
]

export const REGIONS = [
  { id: 'tropical', label: 'Tropical', emoji: '🌴', desc: 'Alta umidade, chuvas frequentes e biodiversidade intensa.' },
  { id: 'desert',   label: 'Deserto',  emoji: '🏜️', desc: 'Irradiação extrema, escassez crítica de água e temperatura elevada.' },
  { id: 'arctic',   label: 'Ártico',   emoji: '🧊', desc: 'Frio severo, geadas constantes e luz solar drasticamente reduzida.' },
  { id: 'ocean',    label: 'Oceano',   emoji: '🌊', desc: 'Salinidade elevada, correntes instáveis e pressão variável.' },
  { id: 'moon',     label: 'Lua',      emoji: '🌕', desc: 'Sem atmosfera, radiação solar direta e gravidade reduzida.' },
  { id: 'mars',     label: 'Marte',    emoji: '🔴', desc: 'Atmosfera rarefeita, tempestades de poeira e temperaturas extremas.' },
]

export const SEASONS = [
  { id: 'spring', label: 'Primavera', desc: 'Temperaturas amenas, chuvas moderadas e período de florescimento.' },
  { id: 'summer', label: 'Verão',     desc: 'Calor intenso, alto consumo de recursos e metabolismo acelerado.' },
  { id: 'autumn', label: 'Outono',    desc: 'Período de colheita, queda foliar e transição térmica gradual.' },
  { id: 'winter', label: 'Inverno',   desc: 'Frio prolongado, baixa luz solar e metabolismo reduzido.' },
]

export const REGION_PT: Record<string, string> = {
  tropical: 'Tropical', desert: 'Deserto', arctic: 'Ártico',
  ocean: 'Oceano', moon: 'Lua', mars: 'Marte',
}

export const SEASON_PT: Record<string, string> = {
  spring: 'Primavera', summer: 'Verão', autumn: 'Outono', winter: 'Inverno',
}

export function getPlatformHealth(platform: PlatformDef, vectors: Record<string, VectorState>): number {
  const scores = platform.vectors.map((k) => {
    const v = vectors[k]
    if (!v) return 1
    if (INVERSE_VECTORS.has(k as VectorKey)) return 1 - v.value / 100
    if (k === 'temperature') return Math.max(0, 1 - Math.abs(v.value - 50) / 50)
    return v.value / 100
  })
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export function healthColor(health: number): string {
  if (health > 0.65) return '#22c55e'
  if (health > 0.35) return '#f59e0b'
  return '#ef4444'
}

export function trendArrow(trend: number): string {
  if (trend > 0.5) return '↑'
  if (trend < -0.5) return '↓'
  return '→'
}
