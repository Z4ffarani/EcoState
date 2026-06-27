"""
Scenario definitions for EcoState.

The player never sees the hidden targets — only the narrative. +/- adjustments
distribute a limited supply budget; on submit the engine compares the distribution
to the targets. `strict_keys` adds per-vector precision requirements on top of
the global average threshold (must ALL pass for a SUCCESS verdict).

`dica` is revealed only after the player fails the scenario once (aggravation > 0).
It should orient without giving the exact target away.

Vector convention (neutral = 0, range -50 … +50):
  target > 0  → player must PUSH UP    (e.g. energy: +35  = "produce more energy")
  target < 0  → player must PUSH DOWN  (e.g. co2:   -30  = "reduce emissions")
  target = 0  → leave at neutral (most vectors in most scenarios)

The SIGN is the direction; the MAGNITUDE is how far from neutral. This makes each
target self-explanatory: a negative number means "reduce", a positive one "increase".

Notably "negative-connotation" vectors (co2, residuos, radiacao) can have POSITIVE
targets too — see metano, nuclear, geotermica, efeito_estufa, paraiso_renovavel —
the counter-intuitive scenarios that force the player to read the narrative.

Scenario fields:
  id           unique string
  tier         1-4  (1=single-vector intro … 4=four-plus vectors, boss)
  title        short displayed title
  narrative    flavour text read by the player (the only hint)
  dica         hint revealed on first failure (aggravation > 0)
  targets      {vector: signed_target}  (multiples of 5; space-only vectors auto-
               filtered for non-space regions by the engine)
  strict_keys  optional {vector: max_distance}  — per-vector success threshold
               that OVERRIDES the global SUCCESS_AVG for those vectors
  regions      optional list of region ids; absent = valid for every region
"""

# ── Vector catalogue ──────────────────────────────────────────────────────────

ADJUSTABLE_VECTORS = [
    "hortalicas",
    "solo",
    "quantidade_de_agua",
    "salinidade",   # ocean only
    "energy",
    "radiacao",
    "temperature",
    "co2",
    "oxygen",    # space only
    "pressure",  # space only
    "medical",
    "infrastructure",
    "residuos",
]

# Vectors that only appear in space regions (Moon, Mars).
SPACE_ONLY_VECTORS = {"oxygen", "pressure"}

# Vectors that only appear in ocean region.
OCEAN_ONLY_VECTORS = {"salinidade"}

# Every vector resets to this neutral value at the start of each scenario.
# 0 = real neutral; negative = pushed down, positive = pushed up.
RESET_VALUE = 0.0

# Human-readable labels for UI / VectorState construction.
VECTOR_LABELS = {
    "hortalicas":         "Hortaliças",
    "solo":               "Solo Agrícola",
    "quantidade_de_agua": "Qtd. de Água",
    "salinidade":         "Salinidade",
    "energy":             "Energia",
    "radiacao":           "Radiação",
    "temperature":        "Temperatura",
    "co2":                "CO₂",
    "oxygen":             "Oxigênio",
    "pressure":           "Pressão",
    "medical":            "Itens Médicos",
    "infrastructure":     "Infraestrutura",
    "residuos":           "Resíduos",
}

# ── Scenario list ─────────────────────────────────────────────────────────────
# All target values are multiples of 5, in the range -50 … +50 (0 = neutral).
# strict_keys thresholds are distances (integers; may be non-multiples of 5).

SCENARIOS: list[dict] = [

    # ══════════════════════════════════════════════════════════════
    # TIER 1 — single vector  (levels 0-2)
    # ══════════════════════════════════════════════════════════════

    {
        "id": "infestacao",
        "tier": 1,
        "title": "Infestação nas plantações",
        "narrative": (
            "Uma praga voraz toma conta das hortaliças. As folhas definham "
            "enquanto enxames se multiplicam sobre o que restou da colheita."
        ),
        "dica": "As plantações precisam de reforço urgente — concentre seus recursos nos cultivos.",
        "targets": {"hortalicas": 30},
    },
    {
        "id": "seca",
        "tier": 1,
        "title": "Seca prolongada",
        "narrative": (
            "Os reservatórios baixam a cada dia sob um sol implacável. "
            "Cada litro de água tornou-se disputado entre os colonos."
        ),
        "dica": "O problema está nos reservatórios — restaure o abastecimento de água.",
        "targets": {"quantidade_de_agua": 30},
    },
    {
        "id": "inundacao",
        "tier": 1,
        "title": "Enchente repentina",
        "narrative": (
            "Chuvas torrenciais inundam os assentamentos. A água invade "
            "tudo e o nível sobe rápido demais para escoar naturalmente."
        ),
        "dica": "Contenha o excesso — reduza o volume de água para estabilizar a situação.",
        "targets": {"quantidade_de_agua": -30},
    },
    {
        "id": "apagao",
        "tier": 1,
        "title": "Apagão energético",
        "narrative": (
            "A rede elétrica oscila e a tensão despenca sem aviso. "
            "Sem energia firme, a colônia inteira para."
        ),
        "dica": "A colônia depende de eletricidade — priorize a geração de energia.",
        "targets": {"energy": 35},
    },
    {
        "id": "onda_calor",
        "tier": 1,
        "title": "Onda de calor",
        "narrative": (
            "O calor extremo castiga a colônia. O ar abrasador torna "
            "cada ambiente sufocante e insuportável sob o sol."
        ),
        "dica": "O calor é o inimigo — refresque o ambiente para proteger a colônia.",
        "targets": {"temperature": -20},
    },
    {
        "id": "frente_gelida",
        "tier": 1,
        "title": "Frente gélida",
        "narrative": (
            "Uma frente fria congela tudo. O ar gélido domina cada "
            "ambiente e ameaça paralisar a colônia inteira."
        ),
        "dica": "O frio corrói tudo — eleve a temperatura interna dos módulos.",
        "targets": {"temperature": 25},
    },
    {
        "id": "surto",
        "tier": 1,
        "title": "Surto epidêmico",
        "narrative": (
            "Um surto se alastra entre os colonos. As enfermarias lotam "
            "e os estoques de remédios desaparecem das prateleiras."
        ),
        "dica": "Vidas dependem de medicamentos — reforce os estoques médicos urgentemente.",
        "targets": {"medical": 30},
    },
    {
        "id": "desgaste_infra",
        "tier": 1,
        "title": "Infraestrutura deteriorada",
        "narrative": (
            "Dutos, passarelas e estruturas cedem após anos de desgaste. "
            "A logística da colônia trava e exige reconstrução urgente."
        ),
        "dica": "Tudo começa pela estrutura — reconstrua a infraestrutura da colônia.",
        "targets": {"infrastructure": 35},
    },
    {
        "id": "solo_degradado",
        "tier": 1,
        "title": "Solo esgotado",
        "narrative": (
            "Décadas de agricultura intensiva deixaram o solo sem nutrientes. "
            "A terra, antes fértil, agora é apenas pó estéril e sem vida."
        ),
        "dica": "A terra precisa ser curada — invista na recuperação do solo agrícola.",
        "targets": {"solo": 30},
    },
    {
        "id": "poluicao_ar",
        "tier": 1,
        "title": "Poluição atmosférica",
        "narrative": (
            "Emissões fora de controle encobrem o céu. A névoa parda "
            "cobre os domos e a qualidade do ar despenca."
        ),
        "dica": "O ar está envenenado — reduza as emissões de CO₂ para limpar a atmosfera.",
        "targets": {"co2": -30},
    },
    {
        "id": "residuos_toxicos",
        "tier": 1,
        "title": "Resíduos tóxicos",
        "narrative": (
            "O acúmulo de resíduos industriais atinge nível crítico. "
            "Os depósitos transbordam e exalam compostos perigosos pela colônia."
        ),
        "dica": "Os resíduos precisam ser eliminados — reduza o lixo industrial ao mínimo.",
        "targets": {"residuos": -30},
    },
    {
        "id": "vazamento_rad",
        "tier": 1,
        "title": "Vazamento de radiação",
        "narrative": (
            "Um vazamento em uma instalação antiga libera radiação. "
            "Os sensores disparam e os colonos são evacuados da zona."
        ),
        "dica": "A fonte de radiação precisa ser contida — reduza a exposição radioativa.",
        "targets": {"radiacao": -30},
    },
    {
        "id": "falta_oxigenio",
        "tier": 1,
        "title": "Falha no suprimento de oxigênio",
        "narrative": (
            "Os geradores de oxigênio apresentam falha crítica. "
            "Os colonos sentem os efeitos da hipóxia nos módulos internos."
        ),
        "dica": "Sem oxigênio não há vida — restaure os geradores de suprimento.",
        "targets": {"oxygen": 30},
        "regions": ["moon", "mars"],
    },
    {
        "id": "despressurizado",
        "tier": 1,
        "title": "Módulo despressurizado",
        "narrative": (
            "Uma falha de vedação faz a pressão do módulo despencar. "
            "Sem correção imediata, o habitat pode tornar-se inóspito."
        ),
        "dica": "A pressão está caindo — sele o módulo e reestabeleça o nível atmosférico.",
        "targets": {"pressure": 25},
        "regions": ["moon", "mars"],
    },

    # ══════════════════════════════════════════════════════════════
    # TIER 2 — dois vetores  (levels 3-5)
    # ══════════════════════════════════════════════════════════════

    {
        "id": "seca_colheita",
        "tier": 2,
        "title": "Seca nas plantações",
        "narrative": (
            "A falta de chuva esvaziou os reservatórios e destruiu a colheita. "
            "Sem água nem hortaliças, a fome se aproxima dos assentamentos."
        ),
        "dica": "Dois sistemas em colapso — restaure a água e as plantações ao mesmo tempo.",
        "targets": {"quantidade_de_agua": 30, "hortalicas": 20},
    },
    {
        "id": "solo_esteril",
        "tier": 2,
        "title": "Solo estéril",
        "narrative": (
            "O solo perdeu completamente sua fertilidade natural. "
            "As hortaliças murcham antes de amadurecer — algo está errado na terra."
        ),
        "dica": "Solo e plantações são inseparáveis — trate os dois em conjunto.",
        "targets": {"solo": 25, "hortalicas": 20},
    },
    {
        "id": "captura_carbono",
        "tier": 2,
        "title": "Captura de carbono",
        "narrative": (
            "As emissões precisam ser neutralizadas. Cientistas propõem usar "
            "as plantações como esponja de CO₂ — coordenação precisa é exigida."
        ),
        "dica": "Cultive mais para absorver o carbono — plantações altas, emissões baixas.",
        "targets": {"hortalicas": 30, "co2": -30},
        "strict_keys": {"hortalicas": 8},
    },
    {
        "id": "biofertilizante",
        "tier": 2,
        "title": "Biofertilizante orgânico",
        "narrative": (
            "Pesquisadores descobriram que manter resíduos orgânicos em nível "
            "elevado — e não descartá-los — fertiliza o solo de forma natural."
        ),
        "dica": "Eleve resíduos orgânicos acima do solo — são eles que fertilizam o terreno.",
        "targets": {"residuos": 30, "solo": 20},
        "strict_keys": {"residuos": 10},
    },
    {
        "id": "biomassa",
        "tier": 2,
        "title": "Usina de biomassa",
        "narrative": (
            "A colônia instalou uma usina que converte resíduos orgânicos em "
            "combustível. Manter os resíduos altos alimenta a geração de energia."
        ),
        "dica": "Os resíduos são o combustível — mantenha-os altos para sustentar a energia.",
        "targets": {"residuos": 25, "energy": 20},
        "strict_keys": {"residuos": 10},
    },
    {
        "id": "nuclear",
        "tier": 2,
        "title": "Reator nuclear controlado",
        "narrative": (
            "O reator nuclear precisa operar em faixa específica de atividade. "
            "Radiação baixa demais apaga o reator; alta demais é catastrófica."
        ),
        "dica": "O reator tem sua janela de operação — radiação e energia precisam subir juntas.",
        "targets": {"radiacao": 25, "energy": 30},
        "strict_keys": {"radiacao": 8, "energy": 10},
    },
    {
        "id": "geotermica",
        "tier": 2,
        "title": "Energia geotérmica",
        "narrative": (
            "A colônia aproveita o calor interno do planeta para gerar energia. "
            "Manter a temperatura elevada é pré-requisito para o processo."
        ),
        "dica": "O calor da terra alimenta tudo — temperatura alta, energia gerada.",
        "targets": {"temperature": 30, "energy": 20},
        "strict_keys": {"temperature": 8},
    },
    {
        "id": "efeito_estufa",
        "tier": 2,
        "title": "Efeito estufa intencional",
        "narrative": (
            "Para aquecer a colônia polar, cientistas propõem aumentar "
            "deliberadamente o CO₂ atmosférico e reter calor nos domos."
        ),
        "dica": "Eleve CO₂ e temperatura — o CO₂ deve subir mais, pois é ele que retém o calor.",
        "targets": {"co2": 30, "temperature": 20},
        "strict_keys": {"co2": 8},
    },
    {
        "id": "calor_epidemia",
        "tier": 2,
        "title": "Crise médica pelo calor",
        "narrative": (
            "A onda de calor já causou dezenas de internações. "
            "É preciso resfriar o ambiente e garantir o estoque de medicamentos."
        ),
        "dica": "Duas frentes: resfriar o ambiente e curar os feridos — temperatura e saúde.",
        "targets": {"temperature": -20, "medical": 20},
    },
    {
        "id": "gelo_energia",
        "tier": 2,
        "title": "Inverno e demanda de energia",
        "narrative": (
            "O frio extremo aumentou o consumo de energia para aquecimento. "
            "Os dois sistemas precisam ser mantidos em equilíbrio."
        ),
        "dica": "Calor e energia andam juntos no inverno — sustente os dois simultaneamente.",
        "targets": {"temperature": 25, "energy": 25},
    },
    {
        "id": "hidreletrica",
        "tier": 2,
        "title": "Hidrelétrica regional",
        "narrative": (
            "A usina hidrelétrica precisa de volume de água adequado para operar. "
            "Mais água nos reservatórios significa mais eletricidade para todos."
        ),
        "dica": "Água movimenta turbinas — reservatório cheio significa mais luz para a colônia.",
        "targets": {"quantidade_de_agua": 25, "energy": 20},
    },
    {
        "id": "infra_energia",
        "tier": 2,
        "title": "Reconstrução energizada",
        "narrative": (
            "A reconstrução da infraestrutura exige maquinário pesado e energia constante. "
            "Os dois vetores precisam subir juntos."
        ),
        "dica": "Construção exige eletricidade constante — energia e infraestrutura crescem juntas.",
        "targets": {"infrastructure": 30, "energy": 20},
    },
    {
        "id": "agua_residuos",
        "tier": 2,
        "title": "Contaminação hídrica",
        "narrative": (
            "Resíduos industriais lixiviam para os mananciais. "
            "Há que reduzir os resíduos e restaurar o abastecimento d'água."
        ),
        "dica": "A contaminação vem dos resíduos — elimine-os para restaurar a água limpa.",
        "targets": {"quantidade_de_agua": 25, "residuos": -30},
    },
    {
        "id": "radiacao_medica",
        "tier": 2,
        "title": "Envenenamento por radiação",
        "narrative": (
            "Colonos foram expostos à radiação e apresentam sintomas graves. "
            "Reduzir a fonte e garantir o estoque médico é urgente."
        ),
        "dica": "Contenha a radiação e trate os feridos — dois alvos urgentes e distintos.",
        "targets": {"radiacao": -30, "medical": 25},
        "strict_keys": {"radiacao": 8},
    },
    {
        "id": "solo_agua",
        "tier": 2,
        "title": "Ciclo hídrico do solo",
        "narrative": (
            "Solo fértil retém e filtra água de forma natural. "
            "Restaurar o solo é o primeiro passo para estabilizar o ciclo d'água."
        ),
        "dica": "Solo saudável filtra e retém água — restaure um para recuperar o outro.",
        "targets": {"solo": 25, "quantidade_de_agua": 20},
    },
    {
        "id": "suporte_vida",
        "tier": 2,
        "title": "Sistemas de suporte de vida",
        "narrative": (
            "A estação detectou falha simultânea nos sistemas de oxigênio e pressão. "
            "Ambos precisam ser restaurados antes que a tripulação seja afetada."
        ),
        "dica": "Dois sistemas vitais falharam — oxigênio e pressão precisam ser restaurados juntos.",
        "targets": {"oxygen": 30, "pressure": 20},
        "regions": ["moon", "mars"],
    },
    {
        "id": "vida_energia",
        "tier": 2,
        "title": "Suporte de vida vs. energia",
        "narrative": (
            "Os sistemas de suporte de vida consomem energia de forma agressiva. "
            "Ambos os parâmetros precisam ser mantidos em operação simultânea."
        ),
        "dica": "Vida e luz precisam coexistir — oxigênio e energia são inseparáveis na base.",
        "targets": {"oxygen": 30, "energy": 25},
        "regions": ["moon", "mars"],
    },
    # ══════════════════════════════════════════════════════════════
    # TIER 3 — três vetores  (levels 6-8)
    # ══════════════════════════════════════════════════════════════

    {
        "id": "seca_total",
        "tier": 3,
        "title": "Colapso hídrico-agrícola",
        "narrative": (
            "A seca prolongada destruiu o solo, secou os reservatórios e matou as "
            "plantações. A colônia enfrenta crise alimentar e hídrica ao mesmo tempo."
        ),
        "dica": "Três sistemas em colapso — água, terra e plantações precisam ser restaurados juntos.",
        "targets": {"quantidade_de_agua": 30, "solo": 20, "hortalicas": 20},
    },
    {
        "id": "blackout_inverno",
        "tier": 3,
        "title": "Apagão no inverno",
        "narrative": (
            "O frio extremo chega junto com o colapso da rede. Sem energia, a "
            "temperatura cai e as estruturas de aquecimento falham em cascata."
        ),
        "dica": "Três pilares do inverno — energia, calor e infraestrutura precisam subir juntos.",
        "targets": {"energy": 30, "temperature": 25, "infrastructure": 20},
        "strict_keys": {"energy": 10},
    },
    {
        "id": "epidemia_colapso",
        "tier": 3,
        "title": "Epidemia e colapso sanitário",
        "narrative": (
            "O surto explodiu junto com o colapso da coleta de resíduos. Sem "
            "infraestrutura hospitalar, medicamentos e saneamento, o caos se instala."
        ),
        "dica": "Saúde exige saneamento e estrutura — saúde alta, resíduos baixos, infraestrutura reconstruída.",
        "targets": {"medical": 30, "residuos": -30, "infrastructure": 20},
        "strict_keys": {"medical": 8},
    },
    {
        "id": "metano",
        "tier": 3,
        "title": "Biorrefinaria de metano",
        "narrative": (
            "A colônia inaugurou uma biorrefinaria de fermentação anaeróbica: resíduos "
            "orgânicos e CO₂ atmosférico entram nos reatores e saem como metano "
            "combustível. Sem matéria-prima suficiente, os reatores operam abaixo da "
            "capacidade e a geração de energia não atinge o nível exigido pela colônia."
        ),
        "dica": "Resíduos e CO₂ são a matéria-prima dos reatores — eleve os dois e a energia subirá.",
        "targets": {"residuos": 30, "co2": 20, "energy": 25},
        "strict_keys": {"residuos": 10, "co2": 10},
    },
    {
        "id": "nuclear_pleno",
        "tier": 3,
        "title": "Planta nuclear em operação",
        "narrative": (
            "A planta nuclear deve operar em regime de alta potência. "
            "Radiação, energia e infraestrutura de contenção precisam ser mantidos juntos."
        ),
        "dica": "Alta potência exige controle triplo — radiação, energia e contenção estrutural.",
        "targets": {"radiacao": 30, "energy": 35, "infrastructure": 20},
        "strict_keys": {"radiacao": 8, "energy": 8},
    },
    {
        "id": "estufa_verde",
        "tier": 3,
        "title": "Estufa verde",
        "narrative": (
            "O projeto de sequestro de carbono usa hortaliças em solo fértil para "
            "absorver CO₂. As três variáveis precisam funcionar como um sistema único."
        ),
        "dica": "Plantas absorvem carbono — solo fértil e plantações altas mantêm as emissões baixas.",
        "targets": {"hortalicas": 30, "solo": 25, "co2": -30},
        "strict_keys": {"co2": 8},
    },
    {
        "id": "chuva_acida",
        "tier": 3,
        "title": "Chuva ácida",
        "narrative": (
            "A alta concentração de CO₂ tornou a chuva ácida, corroendo solo e "
            "plantações. Resolver na fonte é tão urgente quanto reparar os danos."
        ),
        "dica": "Trate a causa e os danos — reduza o CO₂ e restaure o solo e os cultivos.",
        "targets": {"co2": -30, "solo": 25, "hortalicas": 20},
        "strict_keys": {"co2": 8, "solo": 8},
    },
    {
        "id": "biorremediation",
        "tier": 3,
        "title": "Fitorremediação",
        "narrative": (
            "Plantas especiais absorvem contaminantes e purificam a água. Cultivar "
            "hortaliças, reduzir resíduos e restaurar a água formam a estratégia."
        ),
        "dica": "Plantas purificam o que toxinas contaminaram — cultive, elimine resíduos e restaure a água.",
        "targets": {"hortalicas": 25, "residuos": -25, "quantidade_de_agua": 20},
        "strict_keys": {"residuos": 8},
    },
    {
        "id": "geotermica_plena",
        "tier": 3,
        "title": "Geotermia plena",
        "narrative": (
            "A usina geotérmica em plena capacidade exige calor elevado, transmissão "
            "de energia e infraestrutura de perfuração — tudo ao mesmo tempo."
        ),
        "dica": "Calor, energia e estrutura operam como um único sistema — os três precisam estar altos.",
        "targets": {"temperature": 30, "energy": 30, "infrastructure": 20},
        "strict_keys": {"temperature": 8, "energy": 8},
    },
    {
        "id": "crise_hidrica",
        "tier": 3,
        "title": "Crise hídrica sistêmica",
        "narrative": (
            "O colapso do abastecimento afetou encanamentos, hospitais e a saúde "
            "pública. Três frentes precisam ser mantidas simultaneamente."
        ),
        "dica": "A crise hídrica afeta tudo — água, infraestrutura e saúde exigem atenção conjunta.",
        "targets": {"quantidade_de_agua": 25, "infrastructure": 20, "medical": 20},
    },
    {
        "id": "suporte_pleno",
        "tier": 3,
        "title": "Suporte de vida pleno",
        "narrative": (
            "Os três pilares do habitat espacial estão em alerta: oxigênio, pressão "
            "e energia. Uma falha em qualquer um deles compromete toda a missão."
        ),
        "dica": "Os três pilares da base — oxigênio, pressão e energia devem operar juntos.",
        "targets": {"oxygen": 30, "pressure": 25, "energy": 30},
        "strict_keys": {"oxygen": 8, "pressure": 8},
        "regions": ["moon", "mars"],
    },
    {
        "id": "radioterapia",
        "tier": 3,
        "title": "Radiação medicinal espacial",
        "narrative": (
            "Uma doença rara pode ser tratada com radiação controlada. Manter a "
            "radiação em nível terapêutico, preservar itens médicos e energia é o desafio."
        ),
        "dica": "A cura exige precisão: radiação no nível terapêutico, suprimentos médicos e energia garantidos.",
        "targets": {"radiacao": 20, "medical": 25, "energy": 20},
        "strict_keys": {"radiacao": 8},
        "regions": ["moon", "mars"],
    },

    # ══════════════════════════════════════════════════════════════
    # TIER 4 — quatro ou mais vetores  (level 9, boss)
    # ══════════════════════════════════════════════════════════════

    {
        "id": "colapso_sistemico",
        "tier": 4,
        "title": "Colapso sistêmico",
        "narrative": (
            "A colônia enfrenta colapso em cadeia: energia falta, infraestrutura "
            "cede, a saúde pública desmorona e resíduos se acumulam sem controle."
        ),
        "dica": "Quatro frentes abertas — energia e infraestrutura altas, saúde alta, resíduos baixos.",
        "targets": {"energy": 30, "infrastructure": 30, "medical": 25, "residuos": -30},
        "strict_keys": {"energy": 8, "infrastructure": 8},
    },
    {
        "id": "crise_alimentar",
        "tier": 4,
        "title": "Crise alimentar total",
        "narrative": (
            "Hortaliças morrem, reservatórios secam, o solo se degrada e o CO₂ "
            "envenena o ar. A sobrevivência exige equilibrar os quatro sistemas."
        ),
        "dica": "A cadeia alimentar está quebrada — plantações, água e solo altos; CO₂ baixo.",
        "targets": {"hortalicas": 30, "quantidade_de_agua": 25, "solo": 20, "co2": -30},
        "strict_keys": {"hortalicas": 8, "co2": 8},
    },
    {
        "id": "planta_nuclear_crise",
        "tier": 4,
        "title": "Crise na planta nuclear",
        "narrative": (
            "A planta opera no limite. Radiação, energia, contenção estrutural e os "
            "feridos precisam ser gerenciados de forma simultânea e precisa."
        ),
        "dica": "Quatro sistemas críticos — radiação, energia e infraestrutura altas; saúde garantida.",
        "targets": {"radiacao": 30, "energy": 35, "infrastructure": 25, "medical": 20},
        "strict_keys": {"radiacao": 8, "energy": 8, "infrastructure": 10},
    },
    {
        "id": "inverno_quimico",
        "tier": 4,
        "title": "Inverno químico",
        "narrative": (
            "Explosões industriais lançaram poluentes e resíduos na atmosfera, "
            "bloqueando a luz solar. Frio, toxinas e doenças atacam ao mesmo tempo."
        ),
        "dica": "Quatro vetores em sentidos opostos — temperatura e saúde altas; CO₂ e resíduos baixos.",
        "targets": {"temperature": 25, "co2": -30, "residuos": -30, "medical": 25},
        "strict_keys": {"co2": 8, "residuos": 8},
    },
    {
        "id": "paraiso_renovavel",
        "tier": 4,
        "title": "Paraíso renovável",
        "narrative": (
            "A colônia aposta em uma matriz energética integrada: geotermia + biogás. "
            "Calor, energia, resíduos e CO₂ devem ser mantidos em sinergia perfeita."
        ),
        "dica": "A sinergia é contra-intuitiva — resíduos e CO₂ altos alimentam a máquina renovável.",
        "targets": {"energy": 30, "temperature": 25, "residuos": 20, "co2": 20},
        "strict_keys": {"energy": 8, "residuos": 8},
    },
    {
        "id": "colapso_total",
        "tier": 4,
        "title": "Colapso total",
        "narrative": (
            "Seis sistemas críticos falharam simultaneamente. A colônia está à beira "
            "do abandono. Somente uma redistribuição cirúrgica pode evitar o fim."
        ),
        "dica": "Seis frentes — energia, infraestrutura, saúde e plantações altas; água alta; resíduos baixos.",
        "targets": {
            "energy": 30, "infrastructure": 25,
            "medical": 25, "hortalicas": 25,
            "quantidade_de_agua": 20, "residuos": -30,
        },
        "strict_keys": {"energy": 8, "medical": 8},
    },
    {
        "id": "colapso_espacial",
        "tier": 4,
        "title": "Colapso total espacial",
        "narrative": (
            "A base está em colapso: oxigênio, pressão, energia e infraestrutura "
            "falham ao mesmo tempo. A missão está em risco iminente."
        ),
        "dica": "Os quatro pilares da base espacial — oxigênio, pressão, energia e infraestrutura precisam voltar ao máximo.",
        "targets": {
            "oxygen": 30, "pressure": 25,
            "energy": 30, "infrastructure": 25,
        },
        "strict_keys": {"oxygen": 8, "pressure": 8, "energy": 10},
        "regions": ["moon", "mars"],
    },

    # ══════════════════════════════════════════════════════════════
    # TROPICAL EXCLUSIVE — 0 T1 · 4 T2 · 2 T3 · 1 T4
    # ══════════════════════════════════════════════════════════════

    {
        "id": "queimada_floresta",
        "tier": 2,
        "title": "Queimada e erosão florestal",
        "narrative": (
            "As queimadas ilegais destroçam o solo e lançam dióxido de carbono "
            "na atmosfera em escala alarmante. O bioma sofre por todos os lados."
        ),
        "dica": "O fogo destrói o solo e polui o ar — restaure o solo e reduza as emissões ao mesmo tempo.",
        "targets": {"co2": -30, "solo": 30},
        "strict_keys": {"co2": 8},
        "regions": ["tropical"],
    },
    {
        "id": "inundacao_plantacoes",
        "tier": 2,
        "title": "Inundação e colheita",
        "narrative": (
            "A estação das chuvas inesperadamente forte alagou as plantações. "
            "O excesso de água submerge e apodrece os cultivos nos canteiros."
        ),
        "dica": "Chuva excessiva e plantações em colapso pedem soluções opostas — reduza a água e recupere os cultivos.",
        "targets": {"quantidade_de_agua": -30, "hortalicas": 30},
        "regions": ["tropical"],
    },
    {
        "id": "malaria_residuos",
        "tier": 2,
        "title": "Malária e saneamento",
        "narrative": (
            "A malária se alastra pelas zonas úmidas enquanto resíduos orgânicos "
            "acumulados criam novos focos. Os dois problemas se alimentam mutuamente."
        ),
        "dica": "Doença e saneamento são inseparáveis — estoques médicos altos e resíduos eliminados.",
        "targets": {"medical": 30, "residuos": -30},
        "strict_keys": {"medical": 8},
        "regions": ["tropical"],
    },
    {
        "id": "temperatura_umidade_tropical",
        "tier": 2,
        "title": "Calor e chuvas tropicais",
        "narrative": (
            "O calor tropical extremo evapora os reservatórios e a água potável "
            "escasseia. É preciso resfriar o ambiente e repor o abastecimento."
        ),
        "dica": "O clima tropical é duplo — resfrie o ambiente e abasteça os reservatórios ao mesmo tempo.",
        "targets": {"temperature": -20, "quantidade_de_agua": 30},
        "regions": ["tropical"],
    },
    {
        "id": "colapso_florestal",
        "tier": 3,
        "title": "Colapso florestal",
        "narrative": (
            "O desmatamento intenso destruiu o solo, secou os córregos e lançou "
            "toneladas de CO₂ na atmosfera. O ciclo hídrico do bioma está quebrado."
        ),
        "dica": "Três consequências do desmatamento — restaure solo e água, e reduza as emissões.",
        "targets": {"solo": 30, "quantidade_de_agua": 30, "co2": -30},
        "strict_keys": {"co2": 8},
        "regions": ["tropical"],
    },
    {
        "id": "epidemia_tropical",
        "tier": 3,
        "title": "Epidemia tropical",
        "narrative": (
            "O calor e os resíduos acumulados criaram um ambiente ideal para "
            "agentes patogênicos. Um surto grave se alastra em condições insalubres."
        ),
        "dica": "Calor, lixo e doença são um tripé — reduza o calor e os resíduos enquanto reforça a saúde.",
        "targets": {"temperature": -20, "medical": 30, "residuos": -30},
        "strict_keys": {"medical": 8},
        "regions": ["tropical"],
    },
    {
        "id": "caos_tropical",
        "tier": 4,
        "title": "Caos tropical",
        "narrative": (
            "Quatro crises simultâneas: plantações infestadas, surto epidêmico, "
            "acúmulo de resíduos e onda de calor. O colapso tropical em sua forma mais severa."
        ),
        "dica": "Quatro frentes tropicais — plantações e saúde altas; resíduos baixos; calor sob controle.",
        "targets": {"hortalicas": 30, "medical": 25, "residuos": -30, "temperature": -20},
        "strict_keys": {"hortalicas": 8, "medical": 8},
        "regions": ["tropical"],
    },

    # ══════════════════════════════════════════════════════════════
    # DESERT EXCLUSIVE — 1 T1 · 3 T2 · 1 T3 · 1 T4
    # ══════════════════════════════════════════════════════════════

    {
        "id": "canicula_extrema",
        "tier": 1,
        "title": "Calor letal",
        "narrative": (
            "O sol do deserto atinge temperaturas letais. Sem resfriamento imediato, "
            "o calor abrasador torna a colônia inteira inabitável."
        ),
        "dica": "O calor aqui é mais extremo que qualquer onda normal — reduza a temperatura ao máximo.",
        "targets": {"temperature": -35},
        "regions": ["desert"],
    },
    {
        "id": "tempestade_areia",
        "tier": 2,
        "title": "Tempestade de areia",
        "narrative": (
            "Uma tempestade de areia soterrou estruturas e criou montanhas de resíduos "
            "ao redor da colônia. A areia penetra em todos os sistemas."
        ),
        "dica": "A areia destrói e acumula — reconstrua a infraestrutura e elimine os resíduos.",
        "targets": {"infrastructure": 30, "residuos": -30},
        "regions": ["desert"],
    },
    {
        "id": "calor_energia_solar",
        "tier": 2,
        "title": "Sol aliado e inimigo",
        "narrative": (
            "O sol do deserto é tanto o problema quanto a solução. Reduzir o calor "
            "e aproveitar a energia solar são as duas faces da mesma moeda."
        ),
        "dica": "O deserto queima e ilumina — esfrie o ambiente enquanto maximiza a geração solar.",
        "targets": {"temperature": -30, "energy": 30},
        "regions": ["desert"],
    },
    {
        "id": "miragem_hidrica",
        "tier": 2,
        "title": "Miragem hídrica",
        "narrative": (
            "A escassez de água já causou desidratação severa entre os colonos. "
            "Os reservatórios secos e as enfermarias lotadas exigem ação simultânea."
        ),
        "dica": "Sede e doença caminham juntas no deserto — abasteça a água e reforce os estoques médicos.",
        "targets": {"quantidade_de_agua": 35, "medical": 20},
        "regions": ["desert"],
    },
    {
        "id": "colapso_desertico",
        "tier": 3,
        "title": "Colapso do deserto",
        "narrative": (
            "Calor extremo, seca severa e colapso estrutural atacam ao mesmo tempo. "
            "A colônia desértica enfrenta suas três crises mais características juntas."
        ),
        "dica": "Três crises do deserto — resfrie ao máximo, abasteça a água e reconstrua.",
        "targets": {"temperature": -30, "quantidade_de_agua": 35, "infrastructure": 25},
        "strict_keys": {"temperature": 8},
        "regions": ["desert"],
    },
    {
        "id": "fim_do_deserto",
        "tier": 4,
        "title": "Fim do deserto",
        "narrative": (
            "A colônia desértica atingiu seu limite absoluto. Calor letal, seca extrema, "
            "necessidade crítica de energia e resíduos acumulados formam a pior combinação possível."
        ),
        "dica": "Quatro frentes extremas — resfrie ao máximo, encontre água, gere energia solar e elimine resíduos.",
        "targets": {"temperature": -35, "quantidade_de_agua": 35, "energy": 30, "residuos": -30},
        "strict_keys": {"temperature": 8, "quantidade_de_agua": 8},
        "regions": ["desert"],
    },

    # ══════════════════════════════════════════════════════════════
    # ARCTIC EXCLUSIVE — 1 T1 · 3 T2 · 1 T3 · 1 T4
    # ══════════════════════════════════════════════════════════════

    {
        "id": "noite_polar",
        "tier": 1,
        "title": "Noite polar",
        "narrative": (
            "O sol desapareceu no horizonte por meses inteiros e a geração solar da colônia "
            "cessou por completo. As plantas geradoras precisam compensar cada quilowatt "
            "que o astro não entrega — a demanda elétrica nunca foi tão alta."
        ),
        "dica": "Sem sol, tudo depende dos geradores — concentre todos os recursos na produção de energia.",
        "targets": {"energy": 40},
        "regions": ["arctic"],
    },
    {
        "id": "congelamento_tubulacoes",
        "tier": 2,
        "title": "Congelamento de tubulações",
        "narrative": (
            "O frio congelou tubulações, rachou paredes e inutilizou estruturas vitais. "
            "Aquecer o ambiente é urgente para evitar mais danos em cascata."
        ),
        "dica": "O frio corrói a estrutura por dentro — aqueça o ambiente e reconstrua ao mesmo tempo.",
        "targets": {"temperature": 25, "infrastructure": 30},
        "regions": ["arctic"],
    },
    {
        "id": "polar_medico",
        "tier": 2,
        "title": "Hipotermia coletiva",
        "narrative": (
            "A temperatura polar extrema causou hipotermia em dezenas de colonos. "
            "Aquecer e tratar são urgências simultâneas que não podem esperar."
        ),
        "dica": "O frio derruba os colonos — aqueça o ambiente e reforce os estoques médicos.",
        "targets": {"temperature": 25, "medical": 30},
        "regions": ["arctic"],
    },
    {
        "id": "escuridao_polar",
        "tier": 2,
        "title": "Escuridão e colapso estrutural",
        "narrative": (
            "A noite polar e as estruturas deterioradas criam um ciclo vicioso: "
            "sem energia, os equipamentos param e as estruturas continuam cedendo."
        ),
        "dica": "Escuridão e colapso estrutural são inseparáveis — energia máxima e infraestrutura reconstruída.",
        "targets": {"energy": 40, "infrastructure": 25},
        "regions": ["arctic"],
    },
    {
        "id": "tempestade_polar",
        "tier": 3,
        "title": "Tempestade polar",
        "narrative": (
            "Uma tempestade polar sem precedentes combina frio mortal, apagão e colapso "
            "estrutural. Três sistemas do ártico precisam ser sustentados simultaneamente."
        ),
        "dica": "Três pilares do ártico — temperatura, energia e infraestrutura precisam subir juntos.",
        "targets": {"temperature": 30, "energy": 35, "infrastructure": 25},
        "strict_keys": {"energy": 8},
        "regions": ["arctic"],
    },
    {
        "id": "catastrofe_polar",
        "tier": 4,
        "title": "Catástrofe polar",
        "narrative": (
            "A pior tempestade já registrada no ártico. Frio mortal, apagão completo, "
            "estruturas colapsadas e colonos adoecendo — quatro crises simultâneas."
        ),
        "dica": "Quatro sistemas do polo em colapso — calor, energia, infraestrutura e saúde precisam voltar juntos.",
        "targets": {"temperature": 30, "energy": 40, "infrastructure": 25, "medical": 25},
        "strict_keys": {"energy": 8, "temperature": 8},
        "regions": ["arctic"],
    },

    # ══════════════════════════════════════════════════════════════
    # OCEAN EXCLUSIVE — 1 T1 · 3 T2 · 1 T3 · 1 T4
    # ══════════════════════════════════════════════════════════════

    {
        "id": "hipersalinidade",
        "tier": 1,
        "title": "Hipersalinidade",
        "narrative": (
            "A intensa evaporação costeira elevou a salinidade da água a níveis críticos. "
            "O sal saturado torna cada gota imprópria para o consumo."
        ),
        "dica": "A água está salgada demais — ative os sistemas de dessalinização ao máximo.",
        "targets": {"salinidade": -30},
        "regions": ["ocean"],
    },
    {
        "id": "derramamento_petroleo",
        "tier": 2,
        "title": "Derramamento de petróleo",
        "narrative": (
            "Um derramamento contaminou as águas ao redor da colônia. Limpar os resíduos "
            "tóxicos e restaurar o abastecimento de água limpa são as duas prioridades."
        ),
        "dica": "O petróleo contamina tudo — elimine os resíduos e restaure a água simultaneamente.",
        "targets": {"residuos": -35, "quantidade_de_agua": 25},
        "strict_keys": {"residuos": 8},
        "regions": ["ocean"],
    },
    {
        "id": "maremoto",
        "tier": 2,
        "title": "Maremoto",
        "narrative": (
            "Um maremoto varreu a costa. O excesso de água invade tudo enquanto as "
            "estruturas costeiras são completamente destruídas pela força das ondas."
        ),
        "dica": "O maremoto trouxe água demais e destruiu tudo — contenha o excesso e reconstrua.",
        "targets": {"quantidade_de_agua": -30, "infrastructure": 30},
        "regions": ["ocean"],
    },
    {
        "id": "acidificacao_marinha",
        "tier": 2,
        "title": "Acidificação marinha",
        "narrative": (
            "A absorção de CO₂ está acidificando as águas e alterando sua salinidade. "
            "Dois parâmetros químicos do oceano estão fora do controle ao mesmo tempo."
        ),
        "dica": "CO₂ dissolvido e hipersalinidade caminham juntos — reduza as emissões e a salinidade.",
        "targets": {"co2": -30, "salinidade": -25},
        "strict_keys": {"co2": 8},
        "regions": ["ocean"],
    },
    {
        "id": "tufao",
        "tier": 3,
        "title": "Tufão",
        "narrative": (
            "O tufão destruiu as instalações costeiras, cortou o fornecimento de energia "
            "e feriu dezenas de colonos. Três frentes precisam ser mantidas ao mesmo tempo."
        ),
        "dica": "O tufão atinge tudo — reconstrua a infraestrutura, restaure a energia e cuide dos feridos.",
        "targets": {"infrastructure": 30, "energy": 20, "medical": 20},
        "regions": ["ocean"],
    },
    {
        "id": "catastrofe_oceanica",
        "tier": 4,
        "title": "Catástrofe oceânica",
        "narrative": (
            "O oceano colapsa em quatro dimensões simultâneas: hipersalinidade, acidificação, "
            "destruição costeira e escassez de água potável."
        ),
        "dica": "Quatro dimensões da catástrofe marinha — salinidade e CO₂ baixos; infraestrutura e água altos.",
        "targets": {"salinidade": -30, "co2": -30, "infrastructure": 30, "quantidade_de_agua": 20},
        "strict_keys": {"salinidade": 8, "co2": 8},
        "regions": ["ocean"],
    },

    # ══════════════════════════════════════════════════════════════
    # MOON EXCLUSIVE — 0 T1 · 1 T2 · 1 T3 · 1 T4
    # ══════════════════════════════════════════════════════════════

    {
        "id": "tempestade_solar_lunar",
        "tier": 2,
        "title": "Tempestade solar lunar",
        "narrative": (
            "Uma tempestade solar intensa atinge a Lua sem proteção atmosférica. "
            "Os painéis precisam continuar operando enquanto a radiação é contida."
        ),
        "dica": "A tempestade solar precisa de dois controles — reduza a radiação e mantenha a energia dos painéis.",
        "targets": {"radiacao": -30, "energy": 25},
        "strict_keys": {"radiacao": 8},
        "regions": ["moon"],
    },
    {
        "id": "impacto_meteorito",
        "tier": 3,
        "title": "Impacto de meteorito",
        "narrative": (
            "Um meteorito atingiu um módulo externo. Buracos no casco comprometem "
            "a pressão e o oxigênio enquanto a infraestrutura colapsa ao redor."
        ),
        "dica": "O impacto abriu brechas — reconstrua a infraestrutura e restaure pressão e oxigênio.",
        "targets": {"infrastructure": 30, "pressure": 25, "oxygen": 25},
        "strict_keys": {"pressure": 8},
        "regions": ["moon"],
    },
    {
        "id": "colapso_lunar",
        "tier": 4,
        "title": "Colapso da base lunar",
        "narrative": (
            "A base lunar sofreu falha catastrófica em cadeia. Oxigênio, pressão, energia e "
            "infraestrutura precisam ser restaurados de forma simultânea e precisa."
        ),
        "dica": "Quatro pilares da base lunar em colapso — todos críticos, todos urgentes, todos interdependentes.",
        "targets": {"oxygen": 30, "pressure": 25, "energy": 35, "infrastructure": 30},
        "strict_keys": {"oxygen": 8, "pressure": 8, "energy": 8},
        "regions": ["moon"],
    },

    # ══════════════════════════════════════════════════════════════
    # MARS EXCLUSIVE — 0 T1 · 1 T2 · 1 T3 · 1 T4
    # ══════════════════════════════════════════════════════════════

    {
        "id": "terraformacao_inicial",
        "tier": 2,
        "title": "Terraformação inicial",
        "narrative": (
            "A fase inicial da terraformação de Marte exige aumentar deliberadamente "
            "a temperatura e o CO₂ atmosférico para criar um efeito estufa planetário."
        ),
        "dica": "Terraformar é contra-intuitivo — temperatura e CO₂ precisam subir juntos para criar o efeito estufa.",
        "targets": {"temperature": 25, "co2": 20},
        "strict_keys": {"co2": 8},
        "regions": ["mars"],
    },
    {
        "id": "tempestade_global_marte",
        "tier": 3,
        "title": "Tempestade global marciana",
        "narrative": (
            "Uma tempestade de poeira global cobre Marte por meses, bloqueando energia "
            "solar e danificando estruturas. A pressão interna dos módulos também cai."
        ),
        "dica": "A tempestade global atinge tudo — restaure a energia, a infraestrutura e a pressão interna.",
        "targets": {"energy": 30, "infrastructure": 20, "pressure": 25},
        "strict_keys": {"energy": 10},
        "regions": ["mars"],
    },
    {
        "id": "colapso_marciano",
        "tier": 4,
        "title": "Colapso marciano",
        "narrative": (
            "A base marciana entra em colapso total enquanto a missão de terraformação "
            "continua. Oxigênio e pressão vitais convivem com CO₂ alto exigido pela missão."
        ),
        "dica": "Colapso + terraformação — oxigênio e pressão altos para a vida; CO₂ alto e energia máxima para a missão.",
        "targets": {"oxygen": 30, "pressure": 25, "co2": 20, "energy": 35},
        "strict_keys": {"oxygen": 8, "pressure": 8, "energy": 8},
        "regions": ["mars"],
    },
]
