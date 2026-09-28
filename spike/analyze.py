"""Step 2 -- visual understanding via TwelveLabs.

Everything up to now has been deaf to the picture. The engine reads what is
*said* and cuts on that, which works well for a talking-head ad and would fall
apart on a product montage with music and no dialogue -- there would be nothing
to cut on.

This step adds what is *seen*: when the product is on screen, where the shot is
framed, whether the source already carries burned-in captions, and which
moments are visually strongest. That output is handed to the planner alongside
the transcript, so the edit decision is made on both.

It is also, by the cost model, ~90% of the projected per-video spend. So it is
wired as an *option* rather than a given, and cached hard, so we can measure
what it actually buys before committing every video to paying for it.

Flow:  upload asset -> poll until ready -> analyze -> cache
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from pathlib import Path

from config import cache_read, cache_write, file_fingerprint
from ffmpeg_tools import SourceInfo
from net import ApiError, get_json, post_json, post_multipart

BASE = "https://api.twelvelabs.io/v1.3"
CACHE_VARIANT = "pegasus-v2"  # v2: denser moments, whole-video coverage

# Pinned on purpose. The API's implicit default (pegasus1.2) was sunset
# between two of our test runs, and every new upload started failing with a
# swallowed error while cached analyses carried on working -- which is how a
# client's video fell through to a hallucinated transcript. A provider default
# is a dependency you did not choose; name the model, as with whisper-1 and
# gpt-4o-mini.
MODEL = "pegasus1.5"

# Verified 2026 pricing: indexing $0.042/min + Pegasus analysis $0.0292/min.
PRICE_PER_MINUTE = 0.042 + 0.0292

MAX_DIRECT_UPLOAD_MB = 200

# What we actually want back. Asking for a free-form "describe this video"
# returns a paragraph of marketing waffle; asking these specific questions
# returns things the editor can act on.
PROMPT = """You are analysing a video advertisement so an editor can cut it \
into short vertical clips. Report only what is visible on screen. Do not \
describe the audio or repeat the spoken words.

Answer in exactly this format:

ON_SCREEN_TEXT: yes or no (are there burned-in captions or subtitles already \
in the video?)
FRAMING: centered or wide (is there one subject held in the middle of frame, \
or does the important content spread across the full width?)
PRODUCT_VISIBLE: a comma separated list of the time ranges where the product \
itself is clearly on screen, like 12-18s, 44-52s
MOMENTS:
- one line per visually distinct moment, each starting with its time range, \
describing what is shown and how strong it would look as the opening frame of \
a short ad

Be concise. No preamble."""


@dataclass
class VisualAnalysis:
    raw: str
    on_screen_text: bool | None
    framing: str | None
    product_ranges: str
    cost_usd: float
    cached: bool
    seconds_taken: float

    def for_prompt(self) -> str:
        """The slice of this worth spending planner tokens on."""
        return self.raw.strip()


# --------------------------------------------------------------------------- #
# Upload
# --------------------------------------------------------------------------- #


def upload_asset(source: SourceInfo, api_key: str, fingerprint: str) -> str:
    """Upload once, remember the id forever.

    Re-uploading on every prompt iteration would burn the free 600 minutes in
    an afternoon. The asset id is cached against the file's fingerprint, so a
    second run on the same video costs nothing.
    """
    cached = cache_read(fingerprint, "twelvelabs_asset")
    if cached and cached.get("asset_id"):
        return cached["asset_id"]

    if source.size_mb > MAX_DIRECT_UPLOAD_MB:
        raise SystemExit(
            f"{source.path.name} is {source.size_mb:.0f} MB. Direct upload caps at "
            f"{MAX_DIRECT_UPLOAD_MB} MB; the multipart API is needed for this one."
        )

    data = post_multipart(
        f"{BASE}/assets",
        {"x-api-key": api_key},
        fields={"method": "direct", "filename": source.path.name},
        files={"file": source.path},
        timeout=900,
    )
    asset_id = data.get("_id") or data.get("id")
    if not asset_id:
        raise RuntimeError(f"No asset id in upload response: {data}")

    cache_write(fingerprint, "twelvelabs_asset", {"asset_id": asset_id})
    return asset_id


def wait_ready(asset_id: str, api_key: str, *, timeout_s: int = 600) -> None:
    """Poll until the asset is usable. Uploads return immediately as 'processing'."""
    deadline = time.time() + timeout_s
    delay = 2.0
    while time.time() < deadline:
        data = get_json(f"{BASE}/assets/{asset_id}", {"x-api-key": api_key})
        status = (data.get("status") or "").lower()
        if status == "ready":
            return
        if status == "failed":
            raise RuntimeError(f"TwelveLabs failed to process the asset: {data}")
        time.sleep(delay)
        delay = min(delay * 1.4, 15.0)  # back off; these take seconds to minutes
    raise TimeoutError(f"Asset {asset_id} was not ready within {timeout_s}s.")


# --------------------------------------------------------------------------- #
# Analyse
# --------------------------------------------------------------------------- #


def _parse(raw: str) -> tuple[bool | None, str | None, str]:
    text = raw or ""

    m = re.search(r"ON_SCREEN_TEXT:\s*(\w+)", text, re.I)
    on_text: bool | None = None
    if m:
        on_text = m.group(1).strip().lower().startswith("y")

    m = re.search(r"FRAMING:\s*(\w+)", text, re.I)
    framing = m.group(1).strip().lower() if m else None

    m = re.search(r"PRODUCT_VISIBLE:\s*(.+)", text, re.I)
    product = m.group(1).strip() if m else ""

    return on_text, framing, product


def analyze(
    source: SourceInfo,
    api_key: str,
    *,
    force: bool = False,
) -> VisualAnalysis:
    fingerprint = file_fingerprint(source.path)

    if not force:
        cached = cache_read(fingerprint, "visual", CACHE_VARIANT)
        if cached:
            on_text, framing, product = _parse(cached["raw"])
            return VisualAnalysis(
                raw=cached["raw"],
                on_screen_text=on_text,
                framing=framing,
                product_ranges=product,
                cost_usd=0.0,
                cached=True,
                seconds_taken=0.0,
            )

    started = time.perf_counter()
    asset_id = upload_asset(source, api_key, fingerprint)
    wait_ready(asset_id, api_key)

    try:
        data = post_json(
            f"{BASE}/analyze",
            {"x-api-key": api_key},
            {
                "model_name": MODEL,
                # `type` names which source field to read -- it lives inside the
                # video object, not at the request root.
                "video": {"type": "asset_id", "asset_id": asset_id},
                "prompt": PROMPT,
                "temperature": 0.2,
                "stream": False,
            },
            timeout=600,
        )
    except ApiError as e:
        raise RuntimeError(f"TwelveLabs analysis failed: {e.message}") from None

    elapsed = time.perf_counter() - started
    raw = (data.get("data") or "").strip()
    if not raw:
        raise RuntimeError(f"TwelveLabs returned no analysis text: {data}")

    cache_write(fingerprint, "visual", {"raw": raw, "asset_id": asset_id}, CACHE_VARIANT)
    on_text, framing, product = _parse(raw)

    return VisualAnalysis(
        raw=raw,
        on_screen_text=on_text,
        framing=framing,
        product_ranges=product,
        cost_usd=(source.duration / 60.0) * PRICE_PER_MINUTE,
        cached=False,
        seconds_taken=elapsed,
    )
