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


class VectorState(BaseModel):
    # Neutral = 0; negative = pushed down, positive = pushed up. Range -50 … +50.
    value: float = Field(ge=-50, le=50, default=0.0)
    trend: float = 0.0
    critical: bool = False
    label: str = ""
    unit: str = "%"


class GameState(BaseModel):
    session_id: str
    region: RegionType
    user_name: str = "Astronaut"

    # Player-controlled vectors (reset to 50 at each scenario).
    vectors: dict[str, VectorState] = {}

    # Progress is measured in levels, not percentage.
    level: int = Field(ge=0, le=10, default=0)

    # Current scenario.
    scenario_index: int = 0
    scenario_id: str = ""
    scenario_title: str = ""
    scenario_text: str = ""
    scenario_hint: str = ""
    aggravation: int = 0

    # Distribution points for the current scenario: total pool the player can allocate across vectors.
    supply_pool: float = Field(ge=0, default=0.0)
    supply_budget: float = Field(ge=0, default=0.0)

    last_result: Optional[str] = None   # "success" | "miss" | "fail"
    message: Optional[str] = None
    is_victory: bool = False
    is_game_over: bool = False

    # Hidden target configuration — excluded from client serialization.
    targets: dict[str, float] = Field(default_factory=dict)

    def client_json(self) -> str:
        """Serialized state without the hidden targets (safe to send to the client)."""
        return self.model_dump_json(exclude={"targets"})


class CreateSessionRequest(BaseModel):
    user_name: str = Field(default="Astronaut", max_length=32)
    region: RegionType = RegionType.TROPICAL


class SubmitRequest(BaseModel):
    # Final distribution chosen by the player (adjustments happen client-side).
    vectors: dict[str, float] = {}


class UpdateProfileRequest(BaseModel):
    user_name: str = Field(max_length=32)


class WSMessage(BaseModel):
    type: str
    payload: dict = {}
