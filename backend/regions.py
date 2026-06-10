from models import RegionType

REGION_MODIFIERS: dict[str, dict] = {
    RegionType.TROPICAL: {
        "name": "Tropical",
        "emoji": "🌴",
        "space": False,
    },
    RegionType.DESERT: {
        "name": "Desert",
        "emoji": "🏜️",
        "space": False,
    },
    RegionType.ARCTIC: {
        "name": "Arctic",
        "emoji": "🧊",
        "space": False,
    },
    RegionType.OCEAN: {
        "name": "Ocean",
        "emoji": "🌊",
        "space": False,
    },
    RegionType.MOON: {
        "name": "Moon",
        "emoji": "🌕",
        "space": True,
    },
    RegionType.MARS: {
        "name": "Mars",
        "emoji": "🔴",
        "space": True,
    },
}
