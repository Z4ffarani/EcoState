"""
Tick-based simulation engine for EcoState.
All vector values live on a 0-100 scale.
Vectors tagged as 'inverse' are better when LOW (co2, waste, radiation).
"""
from copy import deepcopy
from EcoState.backend.models import GameState, RegionType, SeasonType, ActiveEvent
from EcoState.backend.regions import REGION_MODIFIERS
from EcoState.backend.events import roll_events, tick_events

# Which vectors are better when LOW
INVERSE_VECTORS = {"co2", "waste", "radiation"}

# Natural decay/consumption per tick (positive = decreases value for normal, increases for inverse)
BASE_DECAY: dict[str, float] = {
    "water":          1.0,
    "energy":         1.2,
    "vegetation":     0.4,
    "food":           0.7,
    "oxygen":         0.3,
    "co2":            0.5,   # CO2 accumulates naturally
    "temperature":    0.0,
    "humidity":       0.2,
    "waste":          0.8,   # waste accumulates naturally
    "health":         0.15,
    "radiation":      0.0,
    "pressure":       0.0,
    "light":          0.0,
    "photosynthesis": 0.0,   # fully derived
    "communication":  0.1,
    "medical":        0.2,
}

# Critical thresholds (below = critical for normal, above = critical for inverse)
CRITICAL_THRESHOLD = 25.0

# Supply pool: base income per tick + bonuses for maintaining key vectors
SUPPLY_BASE: float = 3.0
SUPPLY_CAP: float = 300.0
SUPPLY_BONUSES: list[tuple[str, float, float]] = [
    # (vector, threshold, bonus/tick)
    ("energy",        75.0, 1.5),  # surplus energy powers logistics
    ("communication", 70.0, 1.0),  # comms network improves supply chains
    ("medical",       65.0, 0.8),  # healthy crew works better
    ("vegetation",    60.0, 0.5),  # local production reduces import costs
]
INVERSE_CRITICAL_THRESHOLD = 75.0

# Platform groupings for frontend
PLATFORM_GROUPS = {
    "bio":    ["vegetation", "food", "photosynthesis"],
    "hydro":  ["water", "humidity"],
    "power":  ["energy", "light"],
    "atmo":   ["oxygen", "co2", "pressure"],
    "health": ["health", "medical", "radiation", "temperature"],
    "tech":   ["communication", "waste"],
}

# Progress weight per vector (weights sum to 1.0)
PROGRESS_WEIGHTS: dict[str, float] = {
    "health":        0.18,
    "oxygen":        0.13,
    "water":         0.12,
    "food":          0.10,
    "energy":        0.10,
    "pressure":      0.08,
    "radiation":     0.08,
    "co2":           0.07,
    "temperature":   0.06,
    "communication": 0.04,
    "medical":       0.04,
}


def _clamp(v: float) -> float:
    return max(0.0, min(100.0, v))


def _health_score(key: str, value: float) -> float:
    """Returns 0-1 score where 1 = perfect."""
    if key in INVERSE_VECTORS:
        return 1.0 - value / 100.0
    if key == "temperature":
        # optimal at 50 (normalized), degradation increases away from center
        return max(0.0, 1.0 - abs(value - 50) / 50)
    return value / 100.0


def compute_progress(vectors: dict) -> float:
    score = 0.0
    for key, weight in PROGRESS_WEIGHTS.items():
        v = vectors.get(key, {})
        val = v["value"] if isinstance(v, dict) else v.value
        score += _health_score(key, val) * weight
    return round(score * 100, 1)


def apply_interdependencies(v: dict) -> dict:
    """Cascade effects between vectors."""
    # Water → Vegetation decay accelerates
    if v["water"]["value"] < 30:
        deficit = (30 - v["water"]["value"]) / 30
        v["vegetation"]["value"] -= 3 * deficit
        v["food"]["value"] -= 1.5 * deficit

    # Light + Water → Photosynthesis (derived)
    photo = (v["light"]["value"] * 0.4 + v["vegetation"]["value"] * 0.35 + v["water"]["value"] * 0.25)
    photo = _clamp(photo * 0.95)
    prev = v["photosynthesis"]["value"]
    v["photosynthesis"]["value"] = round((prev * 0.6 + photo * 0.4), 2)

    # Photosynthesis → Oxygen
    if v["photosynthesis"]["value"] < 40:
        deficit = (40 - v["photosynthesis"]["value"]) / 40
        v["oxygen"]["value"] -= 2.5 * deficit

    # CO2 ↑ → Oxygen ↓
    if v["co2"]["value"] > 55:
        v["oxygen"]["value"] -= (v["co2"]["value"] - 55) * 0.04

    # Energy ↓ → Communication, Light, Medical degrade
    if v["energy"]["value"] < 30:
        deficit = (30 - v["energy"]["value"]) / 30
        v["communication"]["value"] -= 4 * deficit
        v["light"]["value"] -= 5 * deficit
        v["medical"]["value"] -= 2 * deficit

    # Radiation ↑ → Health ↓
    if v["radiation"]["value"] > 50:
        v["health"]["value"] -= (v["radiation"]["value"] - 50) * 0.06

    # Temperature extreme → Health, Vegetation
    temp_dist = abs(v["temperature"]["value"] - 50) / 50
    if temp_dist > 0.5:
        v["health"]["value"] -= temp_dist * 2
        v["vegetation"]["value"] -= temp_dist * 1.5

    # Waste ↑ → Health, Water
    if v["waste"]["value"] > 65:
        excess = (v["waste"]["value"] - 65) / 35
        v["health"]["value"] -= excess * 2.5
        v["water"]["value"] -= excess * 1.5

    # Pressure ↓ → Health, Oxygen
    if v["pressure"]["value"] < 35:
        deficit = (35 - v["pressure"]["value"]) / 35
        v["health"]["value"] -= 4 * deficit
        v["oxygen"]["value"] -= 2 * deficit

    # Oxygen ↓ → Health
    if v["oxygen"]["value"] < 40:
        deficit = (40 - v["oxygen"]["value"]) / 40
        v["health"]["value"] -= 4 * deficit

    # Medical ↑ → partial health recovery
    if v["medical"]["value"] > 60 and v["health"]["value"] < 95:
        v["health"]["value"] += (v["medical"]["value"] - 60) * 0.02

    # Food ↓ → Health
    if v["food"]["value"] < 25:
        deficit = (25 - v["food"]["value"]) / 25
        v["health"]["value"] -= 2.5 * deficit

    # Vegetation → partial food replenishment
    if v["vegetation"]["value"] > 50:
        v["food"]["value"] += (v["vegetation"]["value"] - 50) * 0.01

    return v


def tick(state: GameState) -> GameState:
    state = deepcopy(state)
    v = {k: s.model_dump() for k, s in state.vectors.items()}

    # Get region-specific decay overrides
    region_cfg = REGION_MODIFIERS.get(state.region, {})
    extra_decay: dict[str, float] = region_cfg.get("decay", {})

    # 1. Apply natural decay
    for key, decay in BASE_DECAY.items():
        if key not in v:
            continue
        d = decay + extra_decay.get(key, 0)
        if key in INVERSE_VECTORS:
            v[key]["value"] += d      # inverse: accumulates
        else:
            v[key]["value"] -= d      # normal: depletes

    # 2. Roll new events
    active_ids = {e.id for e in state.active_events}
    new_events = roll_events(state.region.value, active_ids)
    state.active_events.extend(new_events)

    # 3. Apply ongoing event effects
    state.active_events, event_deltas = tick_events(state.active_events)
    for key, delta in event_deltas.items():
        if key in v:
            v[key]["value"] += delta

    # 4. Cascade interdependencies
    v = apply_interdependencies(v)

    # 5. Clamp all values
    for key in v:
        v[key]["value"] = round(_clamp(v[key]["value"]), 2)

    # 6. Mark critical vectors
    for key in v:
        val = v[key]["value"]
        if key in INVERSE_VECTORS:
            v[key]["critical"] = val > INVERSE_CRITICAL_THRESHOLD
        else:
            v[key]["critical"] = val < CRITICAL_THRESHOLD

    # 7. Compute trends (delta vs previous tick)
    for key in v:
        prev = state.vectors[key].value if key in state.vectors else 50.0
        v[key]["trend"] = round(v[key]["value"] - prev, 2)

    # 8. Rebuild vector models
    from EcoState.backend.models import VectorState
    state.vectors = {k: VectorState(**vd) for k, vd in v.items()}

    # 9. Supply income — grows when key vectors are healthy
    income = SUPPLY_BASE
    for key, threshold, bonus in SUPPLY_BONUSES:
        if state.vectors[key].value > threshold:
            income += bonus
    state.supply_pool = round(min(SUPPLY_CAP, state.supply_pool + income), 2)

    # 10. Progress
    state.progress = compute_progress(v)
    state.tick += 1

    # 10. Win/Lose conditions
    if state.vectors["health"].value <= 0:
        state.is_game_over = True
        state.message = "Falha crítica — suporte de vida colapsou."

    if state.progress >= 95 and state.tick >= 60:
        state.is_victory = True
        state.message = "Estação plenamente estabelecida. Um salto para a humanidade."

    return state
