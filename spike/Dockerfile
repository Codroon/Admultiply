# The AdMultiply render pipeline, as it runs on Railway.
#
# FFmpeg comes from Debian, which builds it with libass: the captions and the
# burned in watermark need that. Their font is not taken from the system. It
# ships with the code in fonts/, so a render looks the same here as it does on
# a laptop.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DATA_DIR=/data

# Sized to fit 1 GB of memory, Railway's trial allowance, measured rather than
# guessed. With FFmpeg free to pick its own thread count, one render on a 12
# thread machine peaked at 913 MB; capped at 2 threads it peaks at 551 MB, 609
# MB with the API, at the cost of rendering slower (83s rather than 33s for a
# three cut job). Two renders at once would not fit, so one job at a time.
# On a plan with more memory, raise both with Railway variables.
ENV FFMPEG_THREADS=2 \
    MAX_CONCURRENT_JOBS=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies before code, so a code change does not reinstall them.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Runs as root on purpose: Railway mounts volumes owned by root, and a
# non-root user could not write the jobs it is there to store.
#
# Railway provides PORT. `exec` makes uvicorn the main process so a redeploy's
# stop signal reaches it and in-flight requests get to finish.
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
