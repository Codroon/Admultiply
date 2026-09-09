"""Minimal HTTP helpers over the standard library.

Deliberately dependency-free: the spike stays `git clone && run` with nothing
to install, which matters for handover. The production service will use the
official SDKs -- this is ~80 lines to avoid an install step during validation.

Retries cover the failures that actually happen against these APIs: 429 rate
limits and 5xx blips. Everything else fails fast with the provider's own error
message, which is usually the useful part.
"""

from __future__ import annotations

import json
import mimetypes
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any

RETRY_STATUSES = {408, 409, 429, 500, 502, 503, 504}


class ApiError(RuntimeError):
    def __init__(self, status: int, body: str, url: str):
        self.status = status
        self.body = body
        self.url = url
        super().__init__(f"HTTP {status} from {url}\n{body[:600]}")

    @property
    def message(self) -> str:
        """The provider's own error message, when it gives us one."""
        try:
            data = json.loads(self.body)
        except json.JSONDecodeError:
            return self.body[:300]
        if isinstance(data, dict):
            err = data.get("error")
            if isinstance(err, dict):
                return err.get("message") or str(err)
            return str(err or data.get("message") or data)
        return str(data)


def _send(req: urllib.request.Request, timeout: int, attempts: int) -> Any:
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8", "replace")
                return json.loads(raw) if raw.strip() else {}
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            if e.code in RETRY_STATUSES and attempt < attempts - 1:
                # Honour Retry-After when the provider sends one.
                wait = float(e.headers.get("Retry-After") or 0) or 2 ** attempt
                time.sleep(min(wait, 30))
                last = e
                continue
            raise ApiError(e.code, body, req.full_url) from None
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < attempts - 1:
                time.sleep(2 ** attempt)
                last = e
                continue
            raise
    raise last if last else RuntimeError("request failed")


def get_json(url: str, headers: dict[str, str], *, timeout: int = 60, attempts: int = 3) -> Any:
    return _send(urllib.request.Request(url, headers=headers), timeout, attempts)


def post_json(
    url: str,
    headers: dict[str, str],
    payload: dict,
    *,
    timeout: int = 180,
    attempts: int = 3,
) -> Any:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={**headers, "Content-Type": "application/json"},
    )
    return _send(req, timeout, attempts)


def post_multipart(
    url: str,
    headers: dict[str, str],
    *,
    fields: dict[str, str] | None = None,
    files: dict[str, Path] | None = None,
    timeout: int = 600,
    attempts: int = 3,
) -> Any:
    """multipart/form-data upload, built by hand.

    `fields` may repeat a key by passing a list value -- OpenAI's
    `timestamp_granularities[]` needs that.
    """
    boundary = f"----admultiply{uuid.uuid4().hex}"
    body = bytearray()

    for name, value in (fields or {}).items():
        values = value if isinstance(value, (list, tuple)) else [value]
        for v in values:
            body += f"--{boundary}\r\n".encode()
            body += f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
            body += f"{v}\r\n".encode()

    for name, path in (files or {}).items():
        ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        body += f"--{boundary}\r\n".encode()
        body += (
            f'Content-Disposition: form-data; name="{name}"; '
            f'filename="{path.name}"\r\n'.encode()
        )
        body += f"Content-Type: {ctype}\r\n\r\n".encode()
        body += path.read_bytes()
        body += b"\r\n"

    body += f"--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={**headers, "Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    return _send(req, timeout, attempts)
