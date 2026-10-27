# Contribution Heatmap

A 3D visualizer for any GitHub user's contribution calendar as a 3D bar grid you can orbit, zoom, and pan. One bar per day, laid out exactly like the familiar GitHub heatmap, with bar height and color scaling by the number of contributions.

The project is split into two independent halves:  
- **`server/`**: a small Express + TypeScript backend proxy
- **`web/`**: a Vite + vanilla TypeScript + Three.js frontend that fetches from the backend and draws the 3D scene

## Prerequisites

- Node.js
- A GitHub Personal Access Token (`read:user` scope for public contributions)

## Backend setup (`server/`)

```sh
cd server
npm install
cp .env.example .env
```

Edit `.env` and set your token

Then start it

```sh
npm run dev
```

The backend listens on http://localhost:3001.

Scripts:  
- `npm run dev` — development server with watch/reload.
- `npm run build` — type-check and compile to `dist/`.
- `npm start` — run the compiled server from `dist/`.

### API

`GET /api/contributions/:username?year=YYYY`

- `year` is optional; it defaults to the current year.
- Returns:

  ```json
  {
    "username": "octocat",
    "year": 2024,
    "totalContributions": 1234,
    "days": [{ "date": "2024-01-01", "count": 3, "weekday": 1, "color": "#..." }]
  }
  ```

- Errors return `{ "error": "..." }` with status `400` (bad year), `404` (unknown user), or `500` (missing token / upstream failure).

## Frontend setup (`web/`)

```sh
cd web
npm install
```

Optionally create a `.env` to point at a non-default backend

```
VITE_API_BASE=http://localhost:3001
```

(If omitted, it defaults to `http://localhost:3001`.)

Then start it

```sh
npm run dev
```

The frontend runs on http://localhost:5173

Scripts:  
- `npm run dev` — Vite dev server.
- `npm run build` — type-check (`tsc`) then `vite build` into `dist/`.
- `npm run preview` — preview the production build.

## Usage

1. Start both halves: the backend on port **3001** and the frontend on port **5173**. The backend's CORS is configured for the frontend's origin.
2. Open http://localhost:5173.
3. Type a GitHub username, choose a year, optionally switch the color theme (GitHub Green or Ocean), and click **Visualize**.
4. Drag to rotate, scroll to zoom, right-drag to pan. The total contribution count for the selected year is shown in the control bar.

## Production

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `GITHUB_TOKEN` | GitHub Personal Access Token (`read:user` scope) | _none_ |
| `PORT` | Port the server binds (on `0.0.0.0`) | `3001` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins (deployed frontend URL) | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in ms for `/api/contributions/*` | `60000` |
| `RATE_LIMIT_MAX` | Max requests per IP per window for `/api/contributions/*` | `30` |
| `CACHE_TTL_MS` | In-memory cache TTL in ms per `username:year` | `600000` |

> `/health` is not rate-limited. Responses carry [helmet](https://helmetjs.github.io/) default security headers.

### Building

Build each half with `npm run build`

```sh
cd server && npm install && npm run build
cd web && npm install && npm run build 
```

The frontend must be built with `VITE_API_BASE` pointing at your deployed backend URL, because the value is baked into the bundle at build time

```sh
cd web
VITE_API_BASE=https://api.your-domain.example npm run build
```

### Docker

Both halves ship a Dockerfile.

Backend

```sh
docker build -t chm3d-server ./server
docker run -p 3001:3001 \
  -e GITHUB_TOKEN=ghp_your_token \
  -e ALLOWED_ORIGINS=https://your-frontend.example \
  chm3d-server
```

Frontend

```sh
docker build -t chm3d-web \
  --build-arg VITE_API_BASE=https://api.your-domain.example ./web
docker run -p 8080:80 chm3d-web
```
