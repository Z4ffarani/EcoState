from models import RegionType, SeasonType

# Base initial values for all vectors (0-100 scale)
BASE_VECTORS = {
    "water":         {"value": 75.0, "label": "Water",        "unit": "%"},
    "energy":        {"value": 70.0, "label": "Energy",       "unit": "%"},
    "vegetation":    {"value": 65.0, "label": "Vegetation",   "unit": "%"},
    "food":          {"value": 72.0, "label": "Food",         "unit": "%"},
    "oxygen":        {"value": 82.0, "label": "Oxygen",       "unit": "%"},
    "co2":           {"value": 18.0, "label": "CO₂",          "unit": "%"},
    "temperature":   {"value": 50.0, "label": "Temperature",  "unit": "norm"},
    "humidity":      {"value": 50.0, "label": "Humidity",     "unit": "%"},
    "waste":         {"value": 10.0, "label": "Waste",        "unit": "%"},
    "health":        {"value": 88.0, "label": "Health",       "unit": "%"},
    "radiation":     {"value": 12.0, "label": "Radiation",    "unit": "%"},
    "pressure":      {"value": 82.0, "label": "Pressure",     "unit": "%"},
    "light":         {"value": 70.0, "label": "Light",        "unit": "%"},
    "photosynthesis":{"value": 60.0, "label": "Photosynth.",  "unit": "%"},
    "communication": {"value": 78.0, "label": "Comms",        "unit": "%"},
    "medical":       {"value": 72.0, "label": "Medical",      "unit": "%"},
}

# Region modifiers applied to base values at session start
REGION_MODIFIERS: dict[str, dict] = {
    RegionType.TROPICAL: {
        "name": "Tropical",
        "emoji": "🌴",
        "base": {
            "water": +20, "light": +20, "temperature": +15,
            "humidity": +30, "vegetation": +20, "radiation": -5,
        },
        "decay": {"water": -0.4},
        "space": False,
    },
    RegionType.DESERT: {
        "name": "Desert",
        "emoji": "🏜️",
        "base": {
            "water": -40, "light": +15, "temperature": +30,
            "humidity": -30, "radiation": +20, "vegetation": -20,
            "food": -15,
        },
        "decay": {"water": +0.6, "temperature": +0.2},
        "space": False,
    },
    RegionType.ARCTIC: {
        "name": "Arctic",
        "emoji": "🧊",
        "base": {
            "temperature": -45, "light": -30, "water": -10,
            "vegetation": -30, "food": -20, "humidity": -20,
        },
        "decay": {"energy": +0.6, "temperature": +0.3},
        "space": False,
    },
    RegionType.OCEAN: {
        "name": "Ocean",
        "emoji": "🌊",
        "base": {
            "water": +35, "pressure": -12, "communication": -20,
            "humidity": +35, "food": +10,
        },
        "decay": {"communication": +0.2},
        "space": False,
    },
    RegionType.MOON: {
        "name": "Moon",
        "emoji": "🌕",
        "base": {
            "water": -65, "pressure": -75, "radiation": +50,
            "communication": -25, "oxygen": -45, "light": +15,
            "temperature": -30,
        },
        "decay": {"oxygen": +0.8, "water": +0.8, "pressure": +0.4},
        "space": True,
    },
    RegionType.MARS: {
        "name": "Mars",
        "emoji": "🔴",
        "base": {
            "water": -60, "pressure": -80, "radiation": +45,
            "temperature": -55, "co2": +50, "oxygen": -55,
            "communication": -40, "food": -30,
        },
        "decay": {"oxygen": +1.2, "water": +0.9, "pressure": +0.6, "co2": +0.5},
        "space": True,
    },
}

# Season modifiers (Earth regions only)
SEASON_MODIFIERS: dict[str, dict] = {
    SeasonType.SPRING: {
        "name": "Spring",
        "base": {"light": +10, "water": +10, "vegetation": +15, "humidity": +10},
    },
    SeasonType.SUMMER: {
        "name": "Summer",
        "base": {"light": +20, "temperature": +15, "water": -10, "food": +10},
    },
    SeasonType.AUTUMN: {
        "name": "Autumn",
        "base": {"light": -10, "temperature": -5, "food": +15, "vegetation": -10},
    },
    SeasonType.WINTER: {
        "name": "Winter",
        "base": {"light": -25, "temperature": -20, "water": -15, "vegetation": -20},
    },
}


def get_initial_vectors(region: RegionType, season: SeasonType) -> dict:
    vectors = {}
    region_cfg = REGION_MODIFIERS[region]
    is_space = region_cfg["space"]

    for key, base in BASE_VECTORS.items():
        val = base["value"]
        val += region_cfg["base"].get(key, 0)
        if not is_space:
            val += SEASON_MODIFIERS[season]["base"].get(key, 0)
        val = max(0.0, min(100.0, val))
        vectors[key] = {
            "value": round(val, 1),
            "trend": 0.0,
            "critical": False,
            "label": base["label"],
            "unit": base["unit"],
        }
    return vectors
