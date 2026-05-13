# OpenGalaxyClient

Python/Flask web client with React frontend for the OpenGalaxy project — a private server for Super GO2, a browser-based space MMO game. Serves as the browser-based game launcher and API proxy between players and the game server.

## Tech Stack

- **Backend:** Python 3.11 + Flask 3.0
- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3
- **HTTP Client:** Axios (frontend), Requests (backend)
- **Flash Embed:** SWFObject v2.2

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend build only)
- OpenGalaxyServer running on port 9090

### Local Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies and build frontend
npm install
npm run build

# Set environment variables (copy from .env.example)
cp .env.example .env
# Edit .env with your values
# CRITICAL: Set GAME_IP to the server's real public IP, not 127.0.0.1

# Run the Flask development server
python main.py
```

Access the web UI at `http://localhost:5001`

### Docker Deployment

```bash
# Build the image
docker build -t open-galaxy-client .

# Run the container
docker run -d -p 5001:5001 \
  -e API_BASE=http://opengalaxy-server:9090 \
  -e GAME_IP=<your-server-ip> \
  -e FLASK_SECRET_KEY=<your-secret> \
  open-galaxy-client
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE` | `http://opengalaxy-server:9090` | Game server API base URL |
| `GAME_IP` | `49.191.48.91` | **CRITICAL** — Game server IP for Flash client (must be real IP) |
| `PORT` | `5001` | Web UI port |
| `CDN_BASE_URL` | *(empty)* | Optional CDN URL for SWF assets |
| `FLASK_SECRET_KEY` | `dev-secret-key-change-in-production` | Flask session secret |

## API Endpoints

| Route | Method | Description |
|--------|--------|-------------|
| `/api/register` | POST | Proxy to game server registration |
| `/api/login` | POST | Proxy to game server login |
| `/api/play-user` | POST | Get session key for game client |
| `/api/status` | GET | Returns auth state, game IP, online players |
| `/` | GET | Serves React SPA |

## Related Repositories

| Repository | Purpose |
|-----------|---------|
| [OpenGalaxyServer](https://github.com/Xerovoxx98/OpenGalaxyServer) | Java/Spring Boot game server |
| [OpenGalaxyOrchestration](https://github.com/Xerovoxx98/OpenGalaxyOrchestration) | Docker Compose orchestration |
| [OpenGalaxyTooling](https://github.com/Xerovoxx98/OpenGalaxyTooling) | CLI tools (ogtool) |
| [OpenGalaxyDocumentation](https://github.com/Xerovoxx98/OpenGalaxyDocumentation) | Project documentation |

## Project Structure

```
├── main.py                 # Flask application entry point
├── src/                    # React frontend source
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Root component with React Router
│   ├── pages/              # LoginPage, Dashboard, GamePage
│   ├── components/         # LoginForm, RegisterForm, GameClient
│   └── services/api.js     # Axios client for /api/* endpoints
├── dist/                   # Built React SPA (served by Flask)
├── asset/                  # Game assets (SWF files, images, audio)
├── data/config.xml         # Game configuration
├── requirements.txt        # Python dependencies
├── package.json            # Node.js dependencies
└── Dockerfile              # Multi-stage build (Node 18 + Python 3.11)
```

## Important Notes

- **GAME_IP is critical** — if set incorrectly, the Flash game client cannot connect to the game server
- The Flash client (SWF) connects via TCP socket to `GAME_IP:5050`
- All `/api/*` routes are proxied to the OpenGalaxyServer
- Frontend is pre-built and served by Flask; use `npm run build` after making changes

## License

Educational and private server purposes only.
