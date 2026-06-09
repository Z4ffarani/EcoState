"""
Session storage with Redis (primary) and in-memory dict (fallback for dev).
Sessions have a TTL of 2 hours.
"""
import json
import os
import uuid
from models import GameState, CreateSessionRequest
from regions import get_initial_vectors
from simulation_engine import PLATFORM_GROUPS, compute_progress

try:
    import redis.asyncio as aioredis
    _REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    _redis_client = aioredis.from_url(_REDIS_URL, decode_responses=True)
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False

_memory_store: dict[str, str] = {}
SESSION_TTL = 7200  # 2 hours


async def _set(key: str, value: str) -> None:
    if REDIS_AVAILABLE:
        try:
            await _redis_client.setex(key, SESSION_TTL, value)
            return
        except Exception:
            pass
    _memory_store[key] = value


async def _get(key: str) -> str | None:
    if REDIS_AVAILABLE:
        try:
            return await _redis_client.get(key)
        except Exception:
            pass
    return _memory_store.get(key)


async def _delete(key: str) -> None:
    if REDIS_AVAILABLE:
        try:
            await _redis_client.delete(key)
            return
        except Exception:
            pass
    _memory_store.pop(key, None)


def _session_key(session_id: str) -> str:
    return f"ecostate:session:{session_id}"


async def create_session(req: CreateSessionRequest) -> GameState:
    session_id = str(uuid.uuid4())
    vectors_raw = get_initial_vectors(req.region, req.season)
    from models import VectorState
    vectors = {k: VectorState(**v) for k, v in vectors_raw.items()}

    initial_progress = compute_progress(0.0, {k: v.model_dump() for k, v in vectors.items()})
    state = GameState(
        session_id=session_id,
        vectors=vectors,
        region=req.region,
        season=req.season,
        user_name=req.user_name,
        progress=initial_progress,
    )
    await save_session(state)
    return state


async def load_session(session_id: str) -> GameState | None:
    raw = await _get(_session_key(session_id))
    if raw is None:
        return None
    return GameState.model_validate_json(raw)


async def save_session(state: GameState) -> None:
    await _set(_session_key(state.session_id), state.model_dump_json())


async def delete_session(session_id: str) -> None:
    await _delete(_session_key(session_id))


def get_platform_groups() -> dict:
    return PLATFORM_GROUPS
