# Fleet Monitor

A local dashboard for a fleet of coding and research agents. Track activity transitions, time active or resting, and last-seen timestamps.

## Getting started

Node.js 20+:

```sh
npm ci
npm start
```

Open http://127.0.0.1:3333. It starts with generated example activity; connect your fleet using the configuration below.

```sh
npm test
```

## Connect a fleet

Copy `.env.example` to `.env`, configure the probes, and run:

```sh
node --env-file=.env server.js
```

| Variable | Purpose |
| --- | --- |
| `FLEET_MODE=live` | Enable local activity probes |
| `SESSIONS_DIR` | Watch for files modified in the past two minutes |
| `RESEARCH_PROCESS_MATCH` / `BUILD_PROCESS_MATCH` | Match agent process command lines |
| `OPENCLAW_GATEWAY_URL` / `OPENCLAW_GATEWAY_TOKEN` | Check an authenticated gateway |
| `STATE_FILE` | Persist status timestamps outside the source tree |

The server binds to loopback. Status reflects process, file, and gateway activity; it does not measure task completion. The operator indicator means the dashboard is running.

## How it works

An Express server polls every five seconds and records transitions. The browser polls `/api/status` and refreshes elapsed-time counters every second. The dashboard is read-only; credentials stay on the server.

## License

[MIT](LICENSE)
