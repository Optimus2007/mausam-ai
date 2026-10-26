"""Runtime configuration, read from environment variables (and an optional .env file)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR.parent / ".env")


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    openweather_api_key: str = field(default_factory=lambda: os.getenv("OPENWEATHER_API_KEY", "").strip())
    # "auto" tries One Call 3.0 first and falls back to the free 2.5 endpoints if the key isn't subscribed.
    onecall_mode: str = field(default_factory=lambda: os.getenv("OPENWEATHER_ONECALL", "auto").strip().lower())
    force_demo: bool = field(default_factory=lambda: _bool("DEMO_MODE", False))
    cache_ttl_seconds: int = field(default_factory=lambda: int(os.getenv("WEATHER_CACHE_TTL", "600")))
    allowed_origins: list[str] = field(
        default_factory=lambda: _list("ALLOWED_ORIGINS", ["http://localhost:5173", "http://127.0.0.1:5173"])
    )
    rate_limit_per_minute: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_PER_MINUTE", "90")))
    frontend_dist: Path = field(
        default_factory=lambda: Path(os.getenv("FRONTEND_DIST", str(BACKEND_DIR.parent / "frontend" / "dist")))
    )

    @property
    def demo_mode(self) -> bool:
        return self.force_demo or not self.openweather_api_key


settings = Settings()
