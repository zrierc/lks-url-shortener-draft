# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build
# Produces: /app/dist/

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM nginx:alpine

# Upstream hostnames injected at build time.
# Local dev:   API_UPSTREAM=api:3000  ANALYTICS_UPSTREAM=analytics:3001
# Production:  both set to the ALB DNS (ALB handles path-based routing)
ARG API_UPSTREAM
ARG ANALYTICS_UPSTREAM

# Copy Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config and substitute upstream placeholders
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i \
    "s|API_UPSTREAM_PLACEHOLDER|${API_UPSTREAM}|g; \
     s|ANALYTICS_UPSTREAM_PLACEHOLDER|${ANALYTICS_UPSTREAM}|g" \
    /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
