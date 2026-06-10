"""
Scenario-based engine for EcoState.

No real-time tick loop. The game advances only when the player submits.

All vectors start neutral (0) regardless of environment. The player reads the
scenario narrative, allocates a fixed pool of distribution points across vectors,
and submits before the timer expires. Results:

  success — avg distance ≤ SUCCESS_AVG  AND  all strict_keys satisfied
  miss    — not success AND avg ≤ MISS_AVG
  fail    — avg > MISS_AVG

Difficulty comes from three sources:
  - Time: shorter countdown at higher tiers and on retry (aggravation)
  - Precision: tighter strict_key thresholds in harder scenarios
  - Points: distribution pool is exactly what the scenario demands (no slack)

After MAX_AGGRAVATION consecutive non-successes on the same scenario → game over.

Scenario tier by level (0→9):
  level  0- 2 → Tier 1 (single vector)
  level  3- 5 → Tier 2 (two vectors)
  level  6- 8 → Tier 3 (three vectors)
  level     9 → Tier 4 (four+ vectors, boss round)
  level    10 → MAX_LEVEL → victory
"""
import math
import random
from models import GameState, VectorState
from scenarios import (
    ADJUSTABLE_VECTORS, SPACE_ONLY_VECTORS, OCEAN_ONLY_VECTORS, RESET_VALUE,
    VECTOR_LABELS, SCENARIOS,
)

MAX_LEVEL = 10
MAX_AGGRAVATION = 2   # aggravates up to twice; 3rd failure → game over

SUCCESS_AVG = 5.0     # average distance ≤ this → success (subject to strict_keys)
MISS_AVG = 12.0       # average distance ≤ this → miss; above → fail

MIN_SUPPLY = 25.0     # minimum supply regardless of targets


# ── Region helpers ────────────────────────────────────────────────────────────

def _clamp(v: float) -> float:
    return max(-50.0, min(50.0, v))


def is_space_region(region) -> bool:
    from regions import REGION_MODIFIERS
    return bool(REGION_MODIFIERS.get(region, {}).get("space", False))


def region_vectors(region) -> list[str]:
    """Adjustable vectors available in this region."""
    space = is_space_region(region)
    ocean = _region_id(region) == "ocean"
    return [
        v for v in ADJUSTABLE_VECTORS
        if (space or v not in SPACE_ONLY_VECTORS)
        and (ocean or v not in OCEAN_ONLY_VECTORS)
    ]


# ── Scenario pool helpers ─────────────────────────────────────────────────────

def _region_id(region) -> str:
    """String ID of a region (handles both RegionType enum and raw string)."""
    return region.value if hasattr(region, "value") else str(region)


def valid_scenarios_by_tier(region) -> dict[int, list[dict]]:
    """
    Returns {tier: [scenario, …]} for all scenarios valid in this region.

    A scenario is excluded when:
      - Its explicit `regions` list doesn't include this region, OR
      - All its targets use vectors unavailable in this region
        (e.g. space-only or ocean-only targets in a non-matching region).
    """
    rid = _region_id(region)
    is_space = is_space_region(region)
    is_ocean = rid == "ocean"
    result: dict[int, list[dict]] = {}

    for s in SCENARIOS:
        allowed = s.get("regions")
        if allowed is not None and rid not in allowed:
            continue
        # Require at least one active target after filtering environment-only vectors.
        effective = {
            k: v for k, v in s["targets"].items()
            if (is_space or k not in SPACE_ONLY_VECTORS)
            and (is_ocean or k not in OCEAN_ONLY_VECTORS)
        }
        if not effective:
            continue
        tier = s.get("tier", 1)
        result.setdefault(tier, []).append(s)

    return result


def scenario_tier_for_level(level: int) -> int:
    if level <= 2:  return 1
    if level <= 5:  return 2
    if level <= 8:  return 3
    return 4



def pick_scenario_for_level(level: int, region, exclude_id: str = "") -> dict:
    """
    Random scenario selection within the appropriate tier for this level.
    Avoids immediately repeating `exclude_id` (prevents same scenario back-to-back).
    Falls back to the excluded scenario only when it's the only option.
    """
    pools = valid_scenarios_by_tier(region)
    tier = scenario_tier_for_level(level)

    pool = pools.get(tier, [])
    if not pool:
        pool = [s for t in sorted(pools) for s in pools[t]]
    if not pool:
        pool = [SCENARIOS[0]]

    candidates = [s for s in pool if s["id"] != exclude_id]
    if not candidates:
        candidates = pool
    return random.choice(candidates)


# ── Target / supply computation ───────────────────────────────────────────────

def compute_targets(scenario: dict, region) -> dict[str, float]:
    """Base targets for the region's vectors. Targets never change between retries."""
    base = scenario.get("targets", {})
    return {v: float(base.get(v, RESET_VALUE)) for v in region_vectors(region)}


def supply_budget(targets: dict[str, float]) -> float:
    """Exact sum of active targets, always a multiple of 5 (matches ±5/10/20 button steps)."""
    total = sum(abs(t - RESET_VALUE) for t in targets.values())
    raw = max(MIN_SUPPLY, total)
    return float(math.ceil(raw / 5) * 5)


# ── Evaluation helpers ────────────────────────────────────────────────────────

def average_distance(vectors: dict[str, VectorState], targets: dict[str, float]) -> float:
    # Only evaluate vectors that have a non-neutral target (the scenario's actual demands).
    # Averaging over neutral-target vectors dilutes difficulty of single-vector scenarios.
    active = [k for k in targets if abs(targets[k] - RESET_VALUE) > 0.1]
    if not active:
        return 0.0
    total = sum(abs(vectors[k].value - targets[k]) for k in active if k in vectors)
    return total / len(active)


def check_strict_keys(
    vectors: dict[str, VectorState],
    targets: dict[str, float],
    strict_keys: dict[str, float],
) -> bool:
    """
    Returns True only when every strict-key vector is within its individual
    max-distance threshold.  A failed strict key means the submission cannot
    be rated SUCCESS even if the global average is fine.
    """
    for key, threshold in strict_keys.items():
        if key in vectors and key in targets:
            if abs(vectors[key].value - targets[key]) > threshold:
                return False
    return True


# ── Vector state factory ──────────────────────────────────────────────────────

def fresh_vectors(region) -> dict[str, VectorState]:
    """All region-available vectors reset to the neutral baseline (50)."""
    return {
        v: VectorState(
            value=RESET_VALUE, trend=0.0, critical=False,
            label=VECTOR_LABELS.get(v, v), unit="%",
        )
        for v in region_vectors(region)
    }


# ── Scenario loading ──────────────────────────────────────────────────────────

def scenario_text(scenario: dict, aggravation: int) -> str:
    base = scenario["narrative"]
    if aggravation == 0:
        return base
    if aggravation == 1:
        return "⚠ A situação se agrava — tente novamente. " + base
    return "⚠ Crise crítica. " + base + " O tempo está se esgotando."


def _apply_scenario(state: GameState, scenario: dict, aggravation: int) -> None:
    """Mutate state to reflect the chosen scenario at the given aggravation level."""
    state.scenario_id    = scenario["id"]
    state.scenario_title = scenario["title"]
    state.scenario_index = state.level          # shown in UI as "Cenário #N"
    state.aggravation    = aggravation
    state.scenario_text  = scenario_text(scenario, aggravation)
    state.scenario_hint  = scenario.get("dica", "") if aggravation > 0 else ""
    state.vectors        = fresh_vectors(state.region)
    state.targets        = compute_targets(scenario, state.region)
    state.supply_budget  = supply_budget(state.targets)
    state.supply_pool    = state.supply_budget


def load_scenario(state: GameState, level: int, aggravation: int) -> GameState:
    """Pick and load a new scenario appropriate for this level."""
    _apply_scenario(state, pick_scenario_for_level(level, state.region, exclude_id=state.scenario_id), aggravation)
    return state


def reload_scenario(state: GameState, aggravation: int) -> GameState:
    """Reload the current scenario (same id) at a higher aggravation."""
    scenario = next((s for s in SCENARIOS if s["id"] == state.scenario_id), None)
    if scenario is None:
        scenario = pick_scenario_for_level(state.level, state.region)
    _apply_scenario(state, scenario, aggravation)
    return state


# ── Main evaluation ───────────────────────────────────────────────────────────

def evaluate_submission(state: GameState) -> GameState:
    """Score the player's distribution and advance, hold, or collapse."""
    avg = average_distance(state.vectors, state.targets)

    scenario = next((s for s in SCENARIOS if s["id"] == state.scenario_id), {})
    strict_keys = scenario.get("strict_keys", {})
    strict_ok = check_strict_keys(state.vectors, state.targets, strict_keys)

    if avg <= SUCCESS_AVG and strict_ok:
        # ── SUCCESS ────────────────────────────────────────────────
        state.level = min(MAX_LEVEL, state.level + 1)
        state.last_result = "success"
        if state.level >= MAX_LEVEL:
            state.is_victory = True
            state.message = "Estado plenamente equilibrado. O ecossistema prospera."
            return state
        state.message = "Padrão alcançado! O estado avança para um novo desafio."
        load_scenario(state, state.level, 0)

    else:
        # ── MISS or FAIL ───────────────────────────────────────────
        if avg <= MISS_AVG:
            state.last_result = "miss"
            state.message = (
                "Quase lá — mas um vetor crítico ficou fora do alvo. A crise se intensifica."
                if not strict_ok else
                "Quase lá, mas o equilíbrio escapou. A crise se intensifica."
            )
        else:
            state.last_result = "fail"
            state.message = "Distribuição muito distante do necessário. Tente novamente."

        next_agg = state.aggravation + 1
        if next_agg > MAX_AGGRAVATION:
            state.is_game_over = True
            state.message = "O estado entrou em colapso. A crise foi além do controle."
            return state

        reload_scenario(state, next_agg)

    return state
