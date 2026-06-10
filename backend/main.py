import json
import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models import CreateSessionRequest, SubmitRequest, UpdateProfileRequest, WSMessage
from session_manager import create_session, load_session, save_session, delete_session, get_platform_groups
from simulation_engine import _clamp, evaluate_submission, region_vectors
from security import (
    create_token, decode_token,
    validate_ws_origin, check_rate_limit, cleanup_rate_limit,
    ALLOWED_ORIGINS,
)

# Active WebSocket connections: session_id -> websocket (used to push live state).
_connections: dict[str, WebSocket] = {}


app = FastAPI(title="EcoState API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer()


def get_session_id(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    return decode_token(credentials.credentials)


def _state_response(state) -> Response:
    """Return the client-safe state (hidden targets stripped) as JSON."""
    return Response(content=state.client_json(), media_type="application/json")


async def _push_state(session_id: str, state) -> None:
    """Push the client-safe state to the live WebSocket, if connected."""
    ws = _connections.get(session_id)
    if ws:
        try:
            await ws.send_text(state.client_json())
        except Exception:
            pass


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
    return Response(
        content=json.dumps({
            "session_id": state.session_id,
            "token": token,
            "state": json.loads(state.client_json()),
        }),
        media_type="application/json",
        status_code=201,
    )


@app.get("/session")
async def get_session(session_id: str = Depends(get_session_id)):
    state = await load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return _state_response(state)


@app.post("/session/submit")
async def submit(body: SubmitRequest, session_id: str = Depends(get_session_id)):
    state = await load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if state.is_victory or state.is_game_over:
        raise HTTPException(status_code=400, detail="Game has ended")

    # Apply the player's final distribution (adjustments were made client-side).
    for key in region_vectors(state.region):
        if key in state.vectors and key in body.vectors:
            state.vectors[key].value = round(_clamp(body.vectors[key]), 2)

    evaluate_submission(state)
    await save_session(state)
    await _push_state(session_id, state)
    return _state_response(state)


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
    _connections.pop(session_id, None)
    await delete_session(session_id)
    return {"deleted": True}


# ─── WebSocket Endpoint ────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = ""):
    try:
        validate_ws_origin(websocket)
    except HTTPException:
        await websocket.close(code=4003)
        return

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

    # Send current state immediately.
    await websocket.send_text(state.client_json())

    try:
        while True:
            raw = await websocket.receive_text()

            if not check_rate_limit(session_id):
                await websocket.send_text(json.dumps({"error": "rate_limited"}))
                continue

            try:
                msg = WSMessage.model_validate_json(raw)
            except Exception:
                await websocket.send_text(json.dumps({"error": "invalid_message"}))
                continue

            if msg.type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    finally:
        _connections.pop(session_id, None)
        cleanup_rate_limit(session_id)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
