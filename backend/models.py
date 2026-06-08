from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class RegionType(str, Enum):
    TROPICAL = "tropical"
    DESERT = "desert"
    ARCTIC = "arctic"
    OCEAN = "ocean"
    MOON = "moon"
    MARS = "mars"


class SeasonType(str, Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


class VectorState(BaseModel):
    value: float = Field(ge=0, le=100)
    trend: float = 0.0
    critical: bool = False
    label: str = ""
    unit: str = "%"


class ActiveEvent(BaseModel):
    id: str
    name: str
    ticks_remaining: int
    effects: dict[str, float]


class GameState(BaseModel):
    session_id: str
    vectors: dict[str, VectorState]
    region: RegionType
    season: SeasonType
    progress: float = Field(ge=0, le=100, default=0.0)
    tick: int = 0
    active_events: list[ActiveEvent] = []
    user_name: str = "Astronaut"
    is_game_over: bool = False
    is_victory: bool = False
    message: Optional[str] = None
    supply_pool: float = Field(ge=0, le=300, default=80.0)


class CreateSessionRequest(BaseModel):
    user_name: str = Field(default="Astronaut", max_length=32)
    region: RegionType = RegionType.TROPICAL
    season: SeasonType = SeasonType.SPRING


class ResourceAction(BaseModel):
    vector: str
    amount: float = Field(ge=-30, le=30)


class UpdateProfileRequest(BaseModel):
    user_name: str = Field(max_length=32)


class WSMessage(BaseModel):
    type: str
    payload: dict = {}
