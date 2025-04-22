# Deui ☕️

The app is consisted of 2 main elements

-   a WebSocket server that connects hardwares (your bluetooth adapter and the DE1), and
-   the Deui frontend.

## Develop

```bash
npm ci

npm start
```

Navigate to http://localhost:3001/

## Run the latest build

```bash
npx deui-coffee@latest
```

And navigate to one of the addresses it gives you, e.g. http://localhost:3001/

## Troubleshooting

For issues related to bluetooth, refer to [`abandonware/noble`](https://github.com/abandonware/noble). Most of what can happen is already described in their README.

### Ubuntu

#### Disconnection Reason 62 (or 0x3E)

The error means "failed to establish connection" and happens after a successful scan. One thing that can help

```bash
systemctl status dbus
systemctl enable bluetooth.service
```

## Environment Configuration for R1 API

This project includes environment-specific configurations for connecting to R1 API endpoints.

### Environment Files

- `.env.development`: Configuration for development environment
- `.env.production`: Configuration for production environment

### Environment Variables

| Variable | Description | Default (Development) | Default (Production) |
|----------|-------------|----------------------|----------------------|
| `VITE_R1_API_URL` | Base URL for R1 REST API | `http://localhost:8000/api` | `http://<tablet-ip>/api` |
| `VITE_R1_WS_URL` | Base URL for R1 WebSocket API | `ws://localhost:8000/ws` | `ws://<tablet-ip>/ws` |

### Running with Different Environments

```bash
# Development environment
npm run dev:local

# Production environment
npm run dev:prod

# Build for development
npm run build:dev

# Build for production
npm run build:prod
```

For more details, see the documentation in `src/config/README.md`.
