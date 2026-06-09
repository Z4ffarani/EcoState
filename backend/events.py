import random
from models import ActiveEvent

CRISIS_EVENTS = [
    {
        "id": "drought",
        "name": "Drought",
        "probability": 0.04,
        "effects": {"water": -25, "vegetation": -12, "food": -10},
        "duration": 3,
        "regions": ["tropical", "desert"],
    },
    {
        "id": "solar_storm",
        "name": "Solar Storm",
        "probability": 0.03,
        "effects": {"radiation": +35, "infrastructure": -45, "energy": -20},
        "duration": 2,
        "regions": ["moon", "mars"],
    },
    {
        "id": "equipment_failure",
        "name": "Equipment Failure",
        "probability": 0.035,
        "effects": {"energy": -30},
        "duration": 1,
        "regions": ["all"],
    },
    {
        "id": "air_leak",
        "name": "Air Leak",
        "probability": 0.025,
        "effects": {"oxygen": -20, "pressure": -22},
        "duration": 2,
        "regions": ["moon", "mars"],
    },
    {
        "id": "epidemic",
        "name": "Epidemic",
        "probability": 0.025,
        "effects": {"health": -22, "medical": -18},
        "duration": 3,
        "regions": ["all"],
    },
    {
        "id": "cold_snap",
        "name": "Cold Snap",
        "probability": 0.04,
        "effects": {"temperature": -25, "energy": -15, "vegetation": -10},
        "duration": 2,
        "regions": ["arctic", "ocean"],
    },
    {
        "id": "dust_storm",
        "name": "Dust Storm",
        "probability": 0.04,
        "effects": {"light": -30, "infrastructure": -25, "photosynthesis": -20},
        "duration": 2,
        "regions": ["desert", "mars"],
    },
    {
        "id": "algae_bloom",
        "name": "Algae Bloom",
        "probability": 0.03,
        "effects": {"water": -15, "oxygen": -10, "food": -8},
        "duration": 2,
        "regions": ["ocean", "tropical"],
    },
    {
        "id": "waste_overflow",
        "name": "Waste Overflow",
        "probability": 0.03,
        "effects": {"waste": +25, "water": -15, "health": -10},
        "duration": 2,
        "regions": ["all"],
    },
]


def roll_events(region: str, active_ids: set[str]) -> list[ActiveEvent]:
    triggered = []
    for ev in CRISIS_EVENTS:
        if ev["id"] in active_ids:
            continue
        applies = ev["regions"] == ["all"] or region in ev["regions"]
        if not applies:
            continue
        if random.random() < ev["probability"]:
            triggered.append(
                ActiveEvent(
                    id=ev["id"],
                    name=ev["name"],
                    ticks_remaining=ev["duration"],
                    effects=ev["effects"],
                )
            )
    return triggered


def tick_events(active: list[ActiveEvent]) -> tuple[list[ActiveEvent], dict[str, float]]:
    """Returns (still_active, combined_effects_this_tick)."""
    combined: dict[str, float] = {}
    still_active = []
    for ev in active:
        for k, v in ev.effects.items():
            combined[k] = combined.get(k, 0) + v * 0.3  # spread over duration
        ev.ticks_remaining -= 1
        if ev.ticks_remaining > 0:
            still_active.append(ev)
    return still_active, combined
