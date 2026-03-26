# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and compile to self-contained binary
COPY . .
RUN bun run build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM gcr.io/distroless/base
WORKDIR /app

ENV APP_ENV=production

# Copy ONLY the compiled binary and migrations
COPY --from=builder /app/dist/server ./server
COPY --from=builder /app/src/database/migrations ./src/database/migrations

USER nonroot:nonroot

EXPOSE 3000
CMD ["./server"]
