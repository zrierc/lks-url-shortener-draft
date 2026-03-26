# lks-url-portal (frontend)

React SPA for the lks-url URL Shortener. Provides a landing page, a URL shortening form, and a stats dashboard with click analytics charts. Served in production by nginx as a static build — all API routing is handled by the ALB before requests reach this container.

---

## Tech Stack

lks-url-portal uses a number of technologies to work properly:

- [React](https://react.dev) - library for building user interfaces
- [TypeScript](https://www.typescriptlang.org) - typed JavaScript at any scale
- [Vite](https://vite.dev) - fast frontend build tool and dev server
- [TanStack Router](https://tanstack.com/router) - type-safe file-based routing for React
- [TanStack Query](https://tanstack.com/query) - data fetching and server state management
- [Recharts](https://recharts.org) - composable charting library for React
- [TailwindCSS](https://tailwindcss.com) - utility-first CSS framework
- [ShadCN UI](https://ui.shadcn.com) - accessible component library built on Radix UI
- [Zod](https://zod.dev) - TypeScript-first schema validation
- [Biome](https://biomejs.dev) - fast linter and formatter
- [Vitest](https://vitest.dev) - Vite-native unit testing framework
- [nginx](https://nginx.org) - high-performance web server for static file serving

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v22 or [Bun](https://bun.sh) v1
- shortener-api running at `http://localhost:3000` (or configured via `.env`)
- analytics-service running at `http://localhost:3001` (or configured via `.env`)

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Copy and configure env (dev-time only — sets Vite proxy targets)
cp .env.example .env
# Edit .env — set API_URL and ANALYTICS_URL

# 3. Start development server
bun run dev
```

App starts at `http://localhost:5173`.  
The Vite dev server proxies `/api/` to shortener-api/analytics-service based on `vite.config.ts`.

> [!NOTE]
> `.env` variables are only consumed by `vite.config.ts` for local proxy configuration. They are not embedded in the production build. In production, the browser calls `/api/*` directly — the ALB handles routing to the correct backend service.

---

## Running with Node.js

> [!NOTE]
> Bun is the primary runtime. If you prefer Node.js v22, all scripts work identically —
> just replace `bun install` with `npm install`. No other changes are needed.

```bash
npm install
npm run dev
npm run build
```

---

## Environment Variables

These variables are **dev-time only** — consumed by `vite.config.ts` to configure the proxy. They are never bundled into the build output.

| Variable        | Required (dev) | Default                 | Description                                    |
| --------------- | -------------- | ----------------------- | ---------------------------------------------- |
| `API_URL`       | No             | `http://localhost:3000` | Proxy target for `/api/*` → shortener-api      |
| `ANALYTICS_URL` | No             | `http://localhost:3001` | Proxy target for `/api/stats*` → analytics-svc |

---

## Pages

### `/` — Landing Page

Static page with hero section, app name, tagline, and a CTA button that navigates to `/shortener`. No data fetching.

### `/shortener` — URL Shortener

- URL input field with Zod validation (must be a valid URL)
- Submits `POST /api/shorten` via TanStack Query mutation
- On success: displays the short link in a result card with a copy-to-clipboard button
- Shows loading state during submission and error state on failure

### `/stats` — Analytics Dashboard

- Short code lookup form — fetches `GET /api/stats/:code`
- Displays: click count, last clicked timestamp
- Four Recharts charts:
  - **Clicks over time** — LineChart (daily buckets)
  - **Device breakdown** — PieChart (desktop / mobile / tablet / bot)
  - **OS breakdown** — BarChart
  - **Browser breakdown** — BarChart
- Leaderboard section — fetches `GET /api/stats` (paginated)
- Loading skeletons while fetching; empty state when no data is available

---

## API Reference

The frontend calls these endpoints. All responses follow the `ApiResponse<T>` envelope: `{ success, data?, error?, timestamp }`.

| Method | Path               | Service       | Description              |
| ------ | ------------------ | ------------- | ------------------------ |
| `POST` | `/api/shorten`     | shortener-api | Shorten a URL            |
| `GET`  | `/api/stats/:code` | analytics-svc | Per-code click analytics |
| `GET`  | `/api/stats`       | analytics-svc | Paginated leaderboard    |

---

## Commands

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `bun run dev`     | Start Vite dev server with HMR       |
| `bun run build`   | Production build to `./dist/`        |
| `bun run preview` | Preview the production build locally |
| `bun run test`    | Run tests with Vitest                |
| `bun run lint`    | Lint with Biome                      |
| `bun run format`  | Format with Biome                    |
| `bun run check`   | Lint + format check with Biome       |

**Build Docker image:**

```bash
docker build -t lks-url-frontend .
docker run -p 80:80 lks-url-frontend
```

The image uses a two-stage build: `oven/bun:1` to build the Vite app, then `nginx:alpine` to serve the static output. The custom `nginx.conf` configures the SPA fallback (`try_files $uri /index.html`). No proxy block is needed — the ALB routes `/api/*` to the backend services before requests reach nginx.

**Deploy to AWS:**

Push any change under `app/frontend/` to the `main` branch. The `deploy-frontend.yml` GitHub Actions workflow builds the image, pushes to ECR (`lks-url-frontend`), and forces a new ECS deployment on `lks-url-frontend-svc` automatically.

---

## References

- [React documentation](https://react.dev/learn)
- [Vite documentation](https://vite.dev/guide/)
- [TanStack Router documentation](https://tanstack.com/router/latest/docs)
- [TanStack Query documentation](https://tanstack.com/query/latest/docs)
- [Recharts documentation](https://recharts.org/en-US/api)
- [TailwindCSS documentation](https://tailwindcss.com/docs)
- [ShadCN UI documentation](https://ui.shadcn.com/docs)
- [Biome documentation](https://biomejs.dev/guides/getting-started/)
- [Vitest documentation](https://vitest.dev/guide/)
- [GitHub Actions — `actions/checkout`](https://github.com/actions/checkout)
- [GitHub Actions — `aws-actions/configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials)
- [GitHub Actions — `aws-actions/amazon-ecr-login`](https://github.com/aws-actions/amazon-ecr-login)
- [Amazon ECS — update-service CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html)
