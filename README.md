# MRF UI

Web frontend for the Materials Research Facility (MRF) booking management system

## Prerequisites

- Node.js 24+
- A running [MRF backend](https://github.com/ukaea/MRFBackend) API

## Environment Variables

Create a `.env` file in the project root:

```
MRF_BACKEND_URL=http://localhost:9000
```

## Local Development

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

### Other Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build (output in `./build`) |
| `npm run preview` | Preview the production build locally |
| `npm run start` | Start the production server (`node build`) |
| `npm run check` | Run `svelte-check` for type diagnostics |

## Docker

### Build and run with Docker Compose

```bash
docker compose up --build
```

The app will be available at `http://localhost:3000`.

### Build the image manually

```bash
docker build -t mrf-ui .
docker run -p 3000:3000 --env-file .env -e NODE_ENV=production -e ORIGIN=http://localhost:3000 mrf-ui
```
