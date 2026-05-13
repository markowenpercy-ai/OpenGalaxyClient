# AGENTS.md — OpenGalaxyClient

## Overview

OpenGalaxyClient is a Python/Flask web client with a React frontend for the OpenGalaxy project — a Super GO2 private server. It serves as the browser-based game launcher and API proxy between players and the game server.

**Repository:** github.com/Xerovoxx98/OpenGalaxyClient
**Branch:** prd (default)

## Tech Stack

- **Backend:** Python 3.11 + Flask 3.0
- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3
- **Build Toolchain:** Node.js 18 (for frontend builds only; not used at runtime)
- **HTTP Client:** Axios (frontend), requests (backend)
- **Flash Embed:** SWFObject v2.2 (loaded from `scripts/loader.js`)

## Project Structure

```
├── main.py                 # Flask application entry point (all backend routes)
├── src/                    # React frontend source
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Root component with React Router
│   ├── index.css           # Tailwind CSS imports + custom styles
│   ├── components/
│   │   ├── GameClient.jsx  # Alternative game client component
│   │   ├── LoginForm.jsx   # Login form with API call
│   │   └── RegisterForm.jsx# Registration form with API call
│   ├── hooks/
│   │   └── useRandomBackground.js  # Picks a random space background image
│   ├── pages/
│   │   ├── LoginPage.jsx   # Login/register page with background
│   │   ├── Dashboard.jsx   # Planet selection, creation, launch
│   │   └── GamePage.jsx    # Loads SWF client via SWFObject
│   └── services/
│       └── api.js          # Axios client for /api/* endpoints
├── dist/                   # Built React SPA (served by Flask at runtime)
├── asset/                  # Game assets (SWF files, images, audio, maps)
│   ├── Client.swf          # Main game client SWF
│   ├── PreLoader.swf       # Flash preloader (entry point for SWFObject)
│   ├── GameRes.swf         # Game resources
│   ├── games_asset.swf     # Game assets
│   ├── galaxy_asset.swf    # Galaxy assets
│   ├── Picres.swf          # Picture resources
│   ├── Airship.swf         # Airship assets
│   ├── chat_asset.swf      # Chat UI assets
│   ├── afont.swf           # Font assets
│   ├── lottery.swf         # Lottery assets
│   ├── map_asset.swf       # Map assets
│   ├── preloader_asset.swf # Preloader assets
│   ├── map/                # Map tile assets
│   ├── music/              # Background music and SFX (MP3)
│   └── res/                # Additional resources
├── data/
│   └── config.xml          # Game configuration (resource paths, music, note messages)
├── scripts/
│   ├── jquery.min.js       # jQuery library
│   └── loader.js           # SWFObject v2.2 (minified) — serves as `window.swfobject`
├── images/                 # Background images for login/dashboard pages
├── static/                 # Static assets
├── PreLoader.swf           # Root-level preloader copy (served at /PreLoader.swf)
├── index.html              # Vite/React HTML entry (loads scripts/loader.js)
├── vite.config.js          # Vite config: outputs to dist/, base path /
├── tailwind.config.js      # Tailwind config: custom "space" color palette
├── postcss.config.js       # PostCSS config: tailwindcss + autoprefixer
├── package.json            # Node.js dependencies
├── requirements.txt        # Python dependencies (flask, requests, werkzeug)
├── Dockerfile              # Multi-stage build: Node 18 build + Python 3.11 runtime
└── .env.example            # Example environment variables
```

## How It Works

### Request Flow

1. **Flask serves the React SPA** from `dist/` at the root path `/`.
2. **React Router** handles client-side routing: `/login`, `/dashboard`, `/play/:userId`.
3. **All `/api/*` routes** are handled by Flask, which proxies requests to the game server.
4. **On "Launch Planet"**: Dashboard opens `/play/{userId}` in a new tab.
5. **GamePage** calls `/api/play-user` to get a session key, sets `window.GAME_IP`, `window.SESSION_KEY`, `window.USER_ID`, then uses SWFObject to embed `PreLoader.swf`.
6. **Flash client** connects to the game server via TCP socket on port 5050.

### Key Global Variables (set by GamePage, read by Flash via SWFObject)

- `window.USER_ID` — The numeric user/planet ID
- `window.SESSION_KEY` — Session key from `/api/play-user`
- `window.GAME_IP` — Game server IP (from `GAME_IP` env var, **must be the server's real IP**)
- `window.CDN_BASE_URL` — Optional CDN URL for SWF assets (from `/api/status` response)

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_BASE` | `http://opengalaxy-server:9090` | Game server API base URL (Docker network name) |
| `GAME_IP` | `49.191.48.91` | **CRITICAL** — Game server IP the Flash client connects to. Must be the server's actual public IP, NOT `127.0.0.1` or `localhost`. |
| `PORT` | `5001` | Web UI port |
| `CDN_BASE_URL` | *(empty)* | Optional CDN URL for serving SWF assets. When set, `config.xml` resource paths are rewritten to use this CDN. |
| `FLASK_SECRET_KEY` | `dev-secret-key-change-in-production` | Flask session secret key |

### API Endpoints (Flask Backend)

| Route | Method | Description |
|---|---|---|
| `/api/register` | POST | Proxy to `{API_BASE}/login/register/account` |
| `/api/login` | POST | Proxy to `{API_BASE}/login/login/account`, stores token in Flask session |
| `/api/play-user` | POST | Proxy to `{API_BASE}/accounts/play/user/{userId}`, returns `userId` + `sessionKey` |
| `/api/logout` | POST | Clears Flask session |
| `/api/status` | GET | Returns auth state, `gameIp`, `cdnUrl`, `onlinePlayers` |
| `/api/users` | GET | Returns users from Flask session |
| `/api/accounts/list/user` | GET | Proxy to `{API_BASE}/accounts/list/user` |
| `/api/accounts/create/user` | POST | Proxy to `{API_BASE}/accounts/create/user` |
| `/data/config.xml` | GET | Serves `data/config.xml`, optionally rewriting resource paths if `CDN_BASE_URL` is set |
| `/asset/<path>` | GET | Serves SWF/image/audio files from `asset/` directory |
| `/images/<path>` | GET | Serves background images from `images/` directory |
| `/scripts/loader.js` | GET | Serves SWFObject (at `scripts/loader.js`) |
| `/PreLoader.swf` | GET | Serves the Flash preloader SWF with no-cache headers |
| `/play-all` | GET | Server-rendered page that opens all user planets in separate tabs |
| `/` | GET | Serves `dist/index.html` (React SPA) |
| `/<path>` | GET | Serves static files from `dist/`, falls back to `dist/index.html` for SPA routing |

### API Response Formats

**`/api/login` success:**
```json
{"success": true, "token": "<token>", "users": [...]}
```

**`/api/play-user` success:**
```json
{"success": true, "userId": 123, "sessionKey": "<key>"}
```

**`/api/status`:**
```json
{"authenticated": true, "username": "...", "users": [...], "gameIp": "...", "cdnUrl": "...", "onlinePlayers": 0}
```

### Frontend Pages

**React Router Routes:**
- `/login` — Login/register page (redirects to `/dashboard` if authenticated)
- `/dashboard` — Planet selection and creation
- `/play/:userId` — Game page (embeds Flash SWF)
- `/` → redirects to `/dashboard` or `/login` based on auth state

**Page Components:**
- `LoginPage.jsx` — Shows LoginForm or RegisterForm with animated space background
- `Dashboard.jsx` — Lists user planets with resources (gold, metal, etc.), allows creating new planets, launching single or all planets
- `GamePage.jsx` — Calls API, sets window globals, embeds SWF via SWFObject

### Flash Client Details

**SWFObject embed call (from GamePage.jsx):**
```javascript
window.swfobject.embedSWF(
  '/PreLoader.swf',    // SWF URL
  'gameContainer',     // DOM element ID
  '100%', '100%',      // Dimensions
  '9.0.0',             // Flash version required
  'expressInstall.swf',// Express install SWF
  flashvars,           // Flash variables (see below)
  params,              // SWF params (menu, scale, wmode, etc.)
  attributes           // DOM attributes
);
```

**Flash variables passed to SWF:**
- `ApiKey`: `"410602368996176"`
- `SessionIP`: Value of `GAME_IP` env var
- `UserId`: From `/api/play-user` response
- `SessionKey` / `SessionSecret`: From `/api/play-user` response
- `ServerPort`: `5050`
- `GameUrl`: `"http://go2.igg.com"`
- `MvpUrl`: `"http://go2.igg.com/paybyvip/?fb_sig_user={userId}"`
- `CdnBase`: From `CDN_BASE_URL` env var
- `Language`: `"1"`
- `ForJS`: `"1"`
- `platform`: `"1"`

**SWFObject loader** is loaded in `index.html` via `<script src="/scripts/loader.js">`, which exposes `window.swfobject`. GamePage polls for its availability with retry logic (200ms intervals, up to 10 retries).

### `data/config.xml`

The game configuration XML defines:
- `<resources>` — SWF resource paths (GameRes, games_asset, Picres, lottery, map_asset, Airship, chat, font)
- `<music>` — Audio resources (MP3 files for music and sound effects)
- `<Note>` — Loading screen messages

When `CDN_BASE_URL` is set, the `path` attribute in `<resources>` is rewritten to point to the CDN.

### Tailwind CSS Theme

Custom color palette defined in `tailwind.config.js`:
- `space-dark`: `#0a0a12` (background)
- `space-accent`: `#00d4ff` (primary accent / cyan)
- `space-accent-dim`: `#0099bb` (dimmed accent)
- `space-panel`: `#12121a` (panel backgrounds)
- `space-border`: `#1a1a2e` (border color)

## Build & Development

### Docker Build (Production)
```bash
docker build -t opengalaxy-client .
docker run -p 5001:5001 -e GAME_IP=<server_ip> opengalaxy-client
```
The Dockerfile is a multi-stage build: Stage 1 installs Node.js 18, runs `npm install && npm run build`; Stage 2 copies the built assets into a `python:3.11-slim` image and installs Python deps.

### Local Development
```bash
# Terminal 1: Build and watch frontend
npm install
npm run dev          # Vite dev server (separate from Flask)

# Terminal 2: Run Flask backend
pip install -r requirements.txt
python main.py       # Runs on port 5001
```

### Testing
Healthcheck: `curl -f http://localhost:5001` (returns the React SPA's `index.html`).

### Build Output
- `npm run build` produces `dist/` directory with the compiled React SPA
- Flask serves `dist/index.html` at `/` and all unmatched routes (SPA fallback)

## Pre-existing Notes

- The `scripts/loader.js` file is the minified SWFObject v2.2 library — do not edit it directly; if updates are needed, replace with a new version from the SWFObject project.
- The `CDN_BASE_URL` env var controls both the `cdnUrl` field in `/api/status` (read by frontend) and the `config.xml` resource path rewriting (read by Flash client). These two mechanisms must be kept in sync.
- There are two game client components: `GamePage.jsx` (used by the router) and `GameClient.jsx` (a standalone alternative). GamePage.jsx is the one currently wired into App.jsx.
- The `play-all` route (`/play-all`) is a server-rendered HTML page that uses JavaScript to open all planet tabs simultaneously and then closes itself. Note the intentional `_blank_` + index window name to allow multiple tabs.
