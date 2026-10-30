# Fleet Monitor

A small local dashboard for a human operator and a fleet of coding/research agents. It tracks activity transitions, shows how long each agent has been active or resting, and refreshes counters in the browser.

## Try it

Node.js 20+ is required.

```sh
npm ci
npm start
```

Open http://127.0.0.1:3333. The default is an offline simulation with synthetic activity. It does not inspect processes, read sessions, or contact a gateway.

```sh
npm test
```

## Monitor a local fleet

Copy `.env.example` to `.env`, configure the optional probes, then run:

```sh
node --env-file=.env server.js
```

Set `FLEET_MODE=live`. `SESSIONS_DIR` detects files modified in the past two minutes. `RESEARCH_PROCESS_MATCH` and `BUILD_PROCESS_MATCH` match local process command lines; keep match strings specific to your agents. `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN` enable an authenticated health check. `STATE_FILE` optionally persists status timestamps outside the source tree. The server binds to loopback.

This is a lightweight activity heuristic, not proof that an agent completed a task or is making useful progress. The operator indicator means the dashboard is running; it does not detect human presence. The UI is read-only and has no agent-control features.

## How it works

An Express server polls every five seconds and records transitions. The vanilla JavaScript UI polls `/api/status` and updates elapsed-time counters every second. Credentials stay on the server; status responses contain generic agent labels and timestamps.

## License

MIT
