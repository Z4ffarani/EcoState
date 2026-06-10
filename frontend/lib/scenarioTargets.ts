import { PLATFORMS, VectorKey } from './vectors'

// Maps scenario_id → the vector keys that are targets in that scenario.
// Derived directly from backend/scenarios.py — update both together when scenarios change.
const SCENARIO_TARGETS: Record<string, VectorKey[]> = {
  // ── Tier 1 ──────────────────────────────────────────────────────────────────
  infestacao:               ['hortalicas'],
  seca:                     ['quantidade_de_agua'],
  inundacao:                ['quantidade_de_agua'],
  apagao:                   ['energy'],
  onda_calor:               ['temperature'],
  frente_gelida:            ['temperature'],
  surto:                    ['medical'],
  desgaste_infra:           ['infrastructure'],
  solo_degradado:           ['solo'],
  poluicao_ar:              ['co2'],
  residuos_toxicos:         ['residuos'],
  vazamento_rad:            ['radiacao'],
  falta_oxigenio:           ['oxygen'],
  despressurizado:          ['pressure'],
  // ── Tier 2 ──────────────────────────────────────────────────────────────────
  seca_colheita:            ['quantidade_de_agua', 'hortalicas'],
  solo_esteril:             ['solo', 'hortalicas'],
  captura_carbono:          ['hortalicas', 'co2'],
  biofertilizante:          ['residuos', 'solo'],
  biomassa:                 ['residuos', 'energy'],
  nuclear:                  ['radiacao', 'energy'],
  geotermica:               ['temperature', 'energy'],
  efeito_estufa:            ['co2', 'temperature'],
  calor_epidemia:           ['temperature', 'medical'],
  gelo_energia:             ['temperature', 'energy'],
  hidreletrica:             ['quantidade_de_agua', 'energy'],
  infra_energia:            ['infrastructure', 'energy'],
  agua_residuos:            ['quantidade_de_agua', 'residuos'],
  radiacao_medica:          ['radiacao', 'medical'],
  solo_agua:                ['solo', 'quantidade_de_agua'],
  suporte_vida:             ['oxygen', 'pressure'],
  vida_energia:             ['oxygen', 'energy'],
  // ── Tier 3 ──────────────────────────────────────────────────────────────────
  seca_total:               ['quantidade_de_agua', 'solo', 'hortalicas'],
  blackout_inverno:         ['energy', 'temperature', 'infrastructure'],
  epidemia_colapso:         ['medical', 'residuos', 'infrastructure'],
  metano:                   ['residuos', 'co2', 'energy'],
  nuclear_pleno:            ['radiacao', 'energy', 'infrastructure'],
  estufa_verde:             ['hortalicas', 'solo', 'co2'],
  chuva_acida:              ['co2', 'solo', 'hortalicas'],
  biorremediation:          ['hortalicas', 'residuos', 'quantidade_de_agua'],
  geotermica_plena:         ['temperature', 'energy', 'infrastructure'],
  crise_hidrica:            ['quantidade_de_agua', 'infrastructure', 'medical'],
  suporte_pleno:            ['oxygen', 'pressure', 'energy'],
  radioterapia:             ['radiacao', 'medical', 'energy'],
  // ── Tier 4 ──────────────────────────────────────────────────────────────────
  colapso_sistemico:        ['energy', 'infrastructure', 'medical', 'residuos'],
  crise_alimentar:          ['hortalicas', 'quantidade_de_agua', 'solo', 'co2'],
  planta_nuclear_crise:     ['radiacao', 'energy', 'infrastructure', 'medical'],
  inverno_quimico:          ['temperature', 'co2', 'residuos', 'medical'],
  paraiso_renovavel:        ['energy', 'temperature', 'residuos', 'co2'],
  colapso_total:            ['energy', 'infrastructure', 'medical', 'hortalicas', 'quantidade_de_agua', 'residuos'],
  colapso_espacial:         ['oxygen', 'pressure', 'energy', 'infrastructure'],
  // ── Tropical exclusive ──────────────────────────────────────────────────────
  queimada_floresta:        ['co2', 'solo'],
  inundacao_plantacoes:     ['quantidade_de_agua', 'hortalicas'],
  malaria_residuos:         ['medical', 'residuos'],
  temperatura_umidade_tropical: ['temperature', 'quantidade_de_agua'],
  colapso_florestal:        ['solo', 'quantidade_de_agua', 'co2'],
  epidemia_tropical:        ['temperature', 'medical', 'residuos'],
  caos_tropical:            ['hortalicas', 'medical', 'residuos', 'temperature'],
  // ── Desert exclusive ────────────────────────────────────────────────────────
  canicula_extrema:         ['temperature'],
  tempestade_areia:         ['infrastructure', 'residuos'],
  calor_energia_solar:      ['temperature', 'energy'],
  miragem_hidrica:          ['quantidade_de_agua', 'medical'],
  colapso_desertico:        ['temperature', 'quantidade_de_agua', 'infrastructure'],
  fim_do_deserto:           ['temperature', 'quantidade_de_agua', 'energy', 'residuos'],
  // ── Arctic exclusive ────────────────────────────────────────────────────────
  noite_polar:              ['energy'],
  congelamento_tubulacoes:  ['temperature', 'infrastructure'],
  polar_medico:             ['temperature', 'medical'],
  escuridao_polar:          ['energy', 'infrastructure'],
  tempestade_polar:         ['temperature', 'energy', 'infrastructure'],
  catastrofe_polar:         ['temperature', 'energy', 'infrastructure', 'medical'],
  // ── Ocean exclusive ─────────────────────────────────────────────────────────
  hipersalinidade:          ['salinidade'],
  derramamento_petroleo:    ['residuos', 'quantidade_de_agua'],
  maremoto:                 ['quantidade_de_agua', 'infrastructure'],
  acidificacao_marinha:     ['co2', 'salinidade'],
  tufao:                    ['infrastructure', 'energy', 'medical'],
  catastrofe_oceanica:      ['salinidade', 'co2', 'infrastructure', 'quantidade_de_agua'],
  // ── Moon exclusive ──────────────────────────────────────────────────────────
  tempestade_solar_lunar:   ['radiacao', 'energy'],
  impacto_meteorito:        ['infrastructure', 'pressure', 'oxygen'],
  colapso_lunar:            ['oxygen', 'pressure', 'energy', 'infrastructure'],
  // ── Mars exclusive ──────────────────────────────────────────────────────────
  terraformacao_inicial:    ['temperature', 'co2'],
  tempestade_global_marte:  ['energy', 'infrastructure', 'pressure'],
  colapso_marciano:         ['oxygen', 'pressure', 'co2', 'energy'],
}

// Reverse lookup: vector key → platform id
const VECTOR_TO_PLATFORM: Partial<Record<VectorKey, string>> = {}
for (const p of PLATFORMS) {
  for (const v of p.vectors) {
    VECTOR_TO_PLATFORM[v] = p.id
  }
}

/**
 * Returns the set of platform IDs that should be visible for the given scenario.
 * Returns null when the scenario is unknown → show all platforms.
 */
export function scenarioPlatforms(scenarioId: string): Set<string> | null {
  const vectors = SCENARIO_TARGETS[scenarioId]
  if (!vectors) return null
  const platforms = new Set<string>()
  for (const v of vectors) {
    const pid = VECTOR_TO_PLATFORM[v]
    if (pid) platforms.add(pid)
  }
  return platforms
}
