"""Environment and on-disk caching.

The cache is the single most important thing in this spike. We will iterate on
the edit-plan prompt many times to get the clips good; if each pass re-ran
transcription and (later) TwelveLabs indexing we would burn the free allowance
in an afternoon and learn nothing about the prompt.

So: everything expensive is keyed by a hash of the source file plus the
parameters that produced it, and written to spike/cache/. Re-running is free
and instant. This also validates the production "analyse once, reuse" decision
the cost model depends on -- TwelveLabs re-bills full video minutes on every
call, which is a 2x swing.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
# The analysis cache is what makes a refine cost a fraction of a cent rather
# than a full re-analysis, so on a server it lives on the persistent volume
# beside the jobs. Without DATA_DIR it stays next to the code, as before.
CACHE_DIR = Path(os.environ.get("DATA_DIR") or Path(__file__).resolve().parent) / "cache"


# --------------------------------------------------------------------------- #
# Environment
# --------------------------------------------------------------------------- #


def load_env(path: Path | None = None) -> dict[str, str]:
    """Read .env.local without adding a dependency on python-dotenv."""
    env_path = path or REPO_ROOT / ".env.local"
    values: dict[str, str] = {}
    if env_path.exists():
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            values[k.strip()] = v.strip().strip('"').strip("'")
    # Real environment wins, so CI and containers can override the file.
    values.update({k: v for k, v in os.environ.items() if k in values or k.endswith("_API_KEY")})
    return values


def require(name: str, env: dict[str, str] | None = None) -> str:
    env = env if env is not None else load_env()
    value = env.get(name, "")
    if not value:
        raise SystemExit(
            f"\nMissing {name}.\n"
            f"Add it to {REPO_ROOT / '.env.local'} (gitignored) as:\n"
            f"  {name}=...\n"
        )
    return value


# --------------------------------------------------------------------------- #
# Content-addressed cache
# --------------------------------------------------------------------------- #


def file_fingerprint(path: Path, chunk_mb: int = 8) -> str:
    """Stable id for a video without hashing gigabytes.

    Head + tail + size is enough to distinguish real inputs, and it keeps
    fingerprinting a video effectively instant.
    """
    size = path.stat().st_size
    h = hashlib.sha256()
    h.update(str(size).encode())
    chunk = chunk_mb * 1024 * 1024
    with path.open("rb") as f:
        h.update(f.read(chunk))
        if size > chunk * 2:
            f.seek(-chunk, os.SEEK_END)
            h.update(f.read(chunk))
    return h.hexdigest()[:16]


def cache_path(fingerprint: str, kind: str, variant: str = "") -> Path:
    name = f"{kind}{('__' + variant) if variant else ''}.json"
    return CACHE_DIR / fingerprint / name


def cache_read(fingerprint: str, kind: str, variant: str = "") -> Any | None:
    p = cache_path(fingerprint, kind, variant)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def cache_write(fingerprint: str, kind: str, data: Any, variant: str = "") -> Path:
    p = cache_path(fingerprint, kind, variant)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return p
