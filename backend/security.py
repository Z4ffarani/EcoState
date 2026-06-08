"""
Security layer:
- JWT token generation and validation
- WebSocket origin validation
- Per-connection rate limiting
"""
import os
import time
from collections import defaultdict
from jose import jwt, JWTError
from fastapi import HTTPException, status, WebSocket

SECRET_KEY = os.getenv("JWT_SECRET", "ecostate-dev-secret-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_SECONDS = 7200  # 2 hours

# Allowed frontend origins (comma-separated in env)
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS: set[str] = {o.strip() for o in _raw_origins.split(",")}

# Rate limiting: max messages per connection per window
RATE_LIMIT_WINDOW = 10   # seconds
RATE_LIMIT_MAX = 20      # messages per window
_rate_counters: dict[str, list[float]] = defaultdict(list)


def create_token(session_id: str) -> str:
    payload = {
        "sub": session_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRE_SECONDS,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    """Returns session_id or raises HTTPException."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        session_id: str = payload.get("sub")
        if not session_id:
            raise ValueError("missing sub")
        return session_id
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def validate_ws_origin(websocket: WebSocket) -> None:
    origin = websocket.headers.get("origin", "")
    if origin and origin not in ALLOWED_ORIGINS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Origin not allowed: {origin}",
        )


def check_rate_limit(connection_id: str) -> bool:
    """Returns True if request is allowed, False if rate-limited."""
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    calls = _rate_counters[connection_id]
    # Purge old timestamps
    calls[:] = [t for t in calls if t > window_start]
    if len(calls) >= RATE_LIMIT_MAX:
        return False
    calls.append(now)
    return True


def cleanup_rate_limit(connection_id: str) -> None:
    _rate_counters.pop(connection_id, None)
