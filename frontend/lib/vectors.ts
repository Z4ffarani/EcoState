// Player-controlled vectors (reset to 50 at the start of each scenario).
export type VectorKey =
  | 'hortalicas' | 'solo'
  | 'quantidade_de_agua' | 'salinidade'
  | 'energy' | 'radiacao'
  | 'temperature' | 'co2'
  | 'oxygen' | 'pressure'
  | 'medical'
  | 'infrastructure' | 'residuos'

export interface VectorState {
  value: number
  trend: number
  critical: boolean
  label: string
  unit: string
}

export interface GameState {
  session_id: string
  region: string
  user_name: string
  vectors: Record<VectorKey, VectorState>
  level: number
  scenario_index: number
  scenario_id: string
  scenario_title: string
  scenario_text: string
  scenario_hint: string
  aggravation: number
  supply_pool: number
  supply_budget: number
  last_result: 'success' | 'miss' | 'fail' | null
  message: string | null
  is_victory: boolean
  is_game_over: boolean
}

export const MAX_LEVEL = 10

// Rank titles shown below the player's name, indexed by level (0–10).
export const LEVEL_RANKS: string[] = [
  'Voluntário',      // 0
  'Agente',          // 1
  'Analista',        // 2
  'Técnico',         // 3
  'Especialista',    // 4
  'Engenheiro',      // 5
  'Coordenador',     // 6
  'Gestor',          // 7
  'Diretor',         // 8
  'Comandante',      // 9
  'Guardião do Estado', // 10 (victory)
]

export interface PlatformDef {
  id: string
  label: string
  vectors: VectorKey[]
  color: string
  angle: number
}

export const VECTOR_LABELS_PT: Record<VectorKey, string> = {
  hortalicas:          'Hortaliças',
  solo:                'Solo Agrícola',
  quantidade_de_agua:  'Qtd. de Água',
  salinidade:          'Salinidade',
  energy:              'Energia',
  radiacao:            'Radiação',
  temperature:         'Temperatura',
  co2:                 'CO₂',
  oxygen:              'Oxigênio',
  pressure:            'Pressão',
  medical:             'Itens Médicos',
  infrastructure:      'Infraestrutura',
  residuos:            'Resíduos',
}

// Vectors that only appear in space regions (Moon, Mars).
export const SPACE_REGIONS = new Set(['moon', 'mars'])
export const SPACE_ONLY_VECTORS = new Set<VectorKey>(['oxygen', 'pressure'])

// Vectors that only appear in ocean regions.
export const OCEAN_REGIONS = new Set(['ocean'])
export const OCEAN_ONLY_VECTORS = new Set<VectorKey>(['salinidade'])

export const PLATFORMS: PlatformDef[] = [
  // bio: crops + soil
  { id: 'bio',    label: 'Biosfera',       vectors: ['hortalicas', 'solo'],                             color: '#22c55e', angle: 0   },
  // hydro: water supply + ocean salinity
  { id: 'hydro',  label: 'Hidrologia',     vectors: ['quantidade_de_agua', 'salinidade'],                color: '#3b82f6', angle: 60  },
  // power: energy + nuclear radiation
  { id: 'power',  label: 'Energia',        vectors: ['energy', 'radiacao'],                             color: '#eab308', angle: 120 },
  // atmo: atmosphere (oxygen + pressure space-only; co2 + temperature universal)
  { id: 'atmo',   label: 'Atmosfera',      vectors: ['oxygen', 'temperature', 'pressure', 'co2'],       color: '#06b6d4', angle: 180 },
  // health: medical supplies
  { id: 'health', label: 'Saúde',          vectors: ['medical'],                                        color: '#ef4444', angle: 240 },
  // tech: built infrastructure + waste management
  { id: 'tech',   label: 'Infraestrutura', vectors: ['infrastructure', 'residuos'],                     color: '#f97316', angle: 300 },
]

export const REGIONS = [
  { id: 'tropical', label: 'Tropical', emoji: '🌴', desc: 'Alta umidade, chuvas frequentes e biodiversidade intensa.' },
  { id: 'desert',   label: 'Deserto',  emoji: '🏜️', desc: 'Irradiação extrema, escassez crítica de água e temperatura elevada.' },
  { id: 'arctic',   label: 'Ártico',   emoji: '🧊', desc: 'Frio severo, geadas constantes e luz solar drasticamente reduzida.' },
  { id: 'ocean',    label: 'Oceano',   emoji: '🌊', desc: 'Salinidade elevada, correntes instáveis e pressão variável.' },
  { id: 'moon',     label: 'Lua',      emoji: '🌕', desc: 'Sem atmosfera, radiação solar direta e gravidade reduzida.' },
  { id: 'mars',     label: 'Marte',    emoji: '🔴', desc: 'Atmosfera rarefeita, tempestades de poeira e temperaturas extremas.' },
]

export const REGION_PT: Record<string, string> = {
  tropical: 'Tropical', desert: 'Deserto', arctic: 'Ártico',
  ocean: 'Oceano', moon: 'Lua', mars: 'Marte',
}

// Neutral baseline: every vector resets to 0. Range is -50 … +50.
// Sign = direction (negative = pushed down, positive = pushed up); magnitude = how far.
export const NEUTRAL = 0
export const VECTOR_MAX = 50

// Signed display: "+30", "-20", "0".
export function formatSigned(value: number): string {
  const r = Math.round(value)
  return r > 0 ? `+${r}` : `${r}`
}

// Platform color in 3D is driven by how far the platform's vectors sit from neutral (0).
// High average deviation = more disturbed (amber / red). All at 0 = fully balanced (green).
export function getPlatformHealth(platform: PlatformDef, vectors: Record<string, VectorState>): number {
  const vecs = platform.vectors.map((k) => vectors[k]).filter(Boolean)
  if (!vecs.length) return 1
  const avgDist = vecs.reduce((s, v) => s + Math.abs(v.value - NEUTRAL), 0) / vecs.length
  return Math.max(0, 1 - avgDist / VECTOR_MAX)
}

export function healthColor(health: number): string {
  if (health > 0.65) return '#00c8ff'
  if (health > 0.35) return '#f59e0b'
  return '#ef4444'
}

export function trendArrow(trend: number): string {
  if (trend > 0.5) return '↑'
  if (trend < -0.5) return '↓'
  return '→'
}
