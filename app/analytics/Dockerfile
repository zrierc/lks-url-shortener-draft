# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun build src/index.ts --compile --outfile server

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM gcr.io/distroless/base-debian12
WORKDIR /app

COPY --from=builder /app/server .
COPY --from=builder /app/src/database/migrations ./src/database/migrations
# geoip-lite data files (not embedded by bun compile)
COPY --from=builder /app/node_modules/geoip-lite/data ./node_modules/geoip-lite/data

USER nonroot:nonroot

EXPOSE 3001
CMD ["./server"]
