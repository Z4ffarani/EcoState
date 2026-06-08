import asyncio
import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from EcoState.backend.models import CreateSessionRequest, ResourceAction, UpdateProfileRequest, WSMessage
from EcoState.backend.session_manager import create_session, load_session, save_session, delete_session, get_platform_groups
from EcoState.backend.simulation_engine import tick, _clamp
from EcoState.backend.security import (
    create_token, decode_token,
    validate_ws_origin, check_rate_limit, cleanup_rate_limit,
    ALLOWED_ORIGINS,
)

# Vectors where higher = worse — managing them never costs supply
INVERSE_VECTORS: set[str] = {'co2', 'waste', 'radiation'}

# Active WebSocket connections: session_id → websocket
_connections: dict[str, WebSocket] = {}
_sim_tasks: dict[str, asyncio.Task] = {}

TICK_INTERVAL = 5  # seconds


async def _simulation_loop(session_id: str) -> None:
    """Background task: tick the simulation every TICK_INTERVAL seconds."""
    while True:
        await asyncio.sleep(TICK_INTERVAL)
        state = await load_session(session_id)
        if state is None:
            break
        if state.is_game_over or state.is_victory:
            ws = _connections.get(session_id)
            if ws:
                await ws.send_text(state.model_dump_json())
            break
        state = tick(state)
        await save_session(state)
        ws = _connections.get(session_id)
        if ws:
            try:
                await ws.send_text(state.model_dump_json())
            except Exception:
                break


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Cancel all sim tasks on shutdown
    for task in _sim_tasks.values():
        task.cancel()


app = FastAPI(title="EcoState API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS) + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer()


def get_session_id(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    return decode_token(credentials.credentials)


# ─── REST Endpoints ────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/platforms")
async def platforms():
    return get_platform_groups()


@app.post("/session", status_code=201)
async def new_session(req: CreateSessionRequest):
    state = await create_session(req)
    token = create_token(state.session_id)
    return {"session_id": state.session_id, "token": token, "state": state}


@app.get("/session")
async def get_session(session_id: str = Depends(get_session_id)):
    state = await load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return state


@app.post("/session/resource")
async def add_resource(action: ResourceAction, session_id: str = Depends(get_session_id)):
    state = await load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if state.is_game_over or state.is_victory:
        raise HTTPException(status_code=400, detail="Game has ended")
    if action.vector not in state.vectors:
        raise HTTPException(status_code=400, detail=f"Unknown vector: {action.vector}")

    cost = 0 if action.vector in INVERSE_VECTORS else abs(action.amount)
    if state.supply_pool < cost:
        raise HTTPException(status_code=400, detail="Insufficient supply pool")

    state.supply_pool = round(max(0.0, state.supply_pool - cost), 2)
    current = state.vectors[action.vector].value
    state.vectors[action.vector].value = round(_clamp(current + action.amount), 2)
    await save_session(state)

    # Push updated state to WebSocket
    ws = _connections.get(session_id)
    if ws:
        try:
            await ws.send_text(state.model_dump_json())
        except Exception:
            pass
    return state


@app.patch("/session/profile")
async def update_profile(body: UpdateProfileRequest, session_id: str = Depends(get_session_id)):
    state = await load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    state.user_name = body.user_name
    await save_session(state)
    return {"user_name": state.user_name}


@app.delete("/session")
async def end_session(session_id: str = Depends(get_session_id)):
    task = _sim_tasks.pop(session_id, None)
    if task:
        task.cancel()
    _connections.pop(session_id, None)
    await delete_session(session_id)
    return {"deleted": True}


# ─── WebSocket Endpoint ────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = ""):
    # Security: origin check
    try:
        validate_ws_origin(websocket)
    except HTTPException:
        await websocket.close(code=4003)
        return

    # Security: JWT validation
    try:
        session_id = decode_token(token)
    except HTTPException:
        await websocket.close(code=4001)
        return

    state = await load_session(session_id)
    if not state:
        await websocket.close(code=4004)
        return

    await websocket.accept()
    _connections[session_id] = websocket

    # Start simulation loop if not already running
    if session_id not in _sim_tasks or _sim_tasks[session_id].done():
        _sim_tasks[session_id] = asyncio.create_task(_simulation_loop(session_id))

    # Send current state immediately
    await websocket.send_text(state.model_dump_json())

    try:
        while True:
            raw = await websocket.receive_text()

            # Rate limiting
            if not check_rate_limit(session_id):
                await websocket.send_text(json.dumps({"error": "rate_limited"}))
                continue

            # Validate message schema
            try:
                msg = WSMessage.model_validate_json(raw)
            except Exception:
                await websocket.send_text(json.dumps({"error": "invalid_message"}))
                continue

            if msg.type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

            elif msg.type == "add_resource":
                vector = str(msg.payload.get("vector", ""))
                amount = float(msg.payload.get("amount", 10))
                amount = max(-30.0, min(30.0, amount))
                if amount == 0:
                    continue

                state = await load_session(session_id)
                if state and vector in state.vectors and not state.is_game_over:
                    cost = 0 if vector in INVERSE_VECTORS else abs(amount)
                    if state.supply_pool >= cost:
                        state.supply_pool = round(max(0.0, state.supply_pool - cost), 2)
                        state.vectors[vector].value = round(_clamp(state.vectors[vector].value + amount), 2)
                        await save_session(state)
                    await websocket.send_text(state.model_dump_json())

    except WebSocketDisconnect:
        pass
    finally:
        _connections.pop(session_id, None)
        cleanup_rate_limit(session_id)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
