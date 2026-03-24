# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# npm ci for deterministic installs (requires package-lock.json)
# We use npm because we need Node.js for Vite build
COPY package.json bun.lock ./
RUN npm install

COPY . .
RUN npm run build
# Produces: /app/dist/

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copy Vite build output
COPY --from=builder /app/dist .

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
