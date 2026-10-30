const express = require('express');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const AGENTS = ['operator', 'coordinator', 'researcher', 'builder'];

function initialState(now = Date.now()) {
  return Object.fromEntries(AGENTS.map(name => [name, {
    status: name === 'operator' ? 'active' : 'unknown', since: now, lastActive: null,
  }]));
}

function updateStatus(state, name, active, now = Date.now()) {
  const status = active ? 'active' : 'resting';
  if (state[name].status !== status) {
    state[name].status = status;
    state[name].since = now;
  }
  if (active) state[name].lastActive = now;
}

function demoActivity(now) {
  const phase = Math.floor(now / 15000);
  return {operator: true, coordinator: true, researcher: phase % 3 !== 0, builder: phase % 2 === 0};
}

async function liveActivity(env) {
  let processes = '';
  try { processes = execFileSync('ps', ['-axo', 'command='], {encoding: 'utf8', timeout: 4000}); } catch {}
  let sessionActive = false;
  if (env.SESSIONS_DIR) {
    try {
      sessionActive = fs.readdirSync(env.SESSIONS_DIR).some(file =>
        Date.now() - fs.statSync(path.join(env.SESSIONS_DIR, file)).mtimeMs < 120000);
    } catch {}
  }
  let gatewayActive = false;
  if (env.OPENCLAW_GATEWAY_URL && env.OPENCLAW_GATEWAY_TOKEN) {
    try {
      const response = await fetch(new URL('/health', env.OPENCLAW_GATEWAY_URL), {
        headers: {Authorization: `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}`},
        signal: AbortSignal.timeout(4000),
      });
      const health = response.ok ? await response.json() : null;
      gatewayActive = health && ['ok', 'healthy'].includes(health.status);
    } catch {}
  }
  return {
    operator: true,
    coordinator: Boolean(gatewayActive || sessionActive),
    researcher: Boolean(env.RESEARCH_PROCESS_MATCH && processes.includes(env.RESEARCH_PROCESS_MATCH)),
    builder: Boolean(env.BUILD_PROCESS_MATCH && processes.includes(env.BUILD_PROCESS_MATCH)),
  };
}

function createMonitor({env = process.env, now = Date.now, activity} = {}) {
  const mode = env.FLEET_MODE || 'demo';
  if (!['demo', 'live'].includes(mode)) throw new Error('FLEET_MODE must be demo or live');
  let state = initialState(now());
  if (mode === 'live' && env.STATE_FILE) {
    try {
      const saved = JSON.parse(fs.readFileSync(env.STATE_FILE, 'utf8'));
      for (const name of AGENTS) {
        if (saved[name] && Number.isFinite(saved[name].since)) state[name] = saved[name];
      }
    } catch {}
  }
  const app = express();
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/api/status', (_req, res) => {
    const timestamp = now();
    const agents = Object.fromEntries(AGENTS.map(name => [name, {...state[name], duration: timestamp - state[name].since}]));
    res.json({timestamp, mode, agents});
  });
  async function poll() {
    const timestamp = now();
    const active = activity ? await activity() : mode === 'demo' ? demoActivity(timestamp) : await liveActivity(env);
    for (const name of AGENTS) updateStatus(state, name, Boolean(active[name]), timestamp);
    if (mode === 'live' && env.STATE_FILE) fs.writeFileSync(env.STATE_FILE, JSON.stringify(state, null, 2));
  }
  return {app, poll};
}

if (require.main === module) {
  const monitor = createMonitor();
  monitor.poll().then(() => {
    setInterval(() => monitor.poll().catch(() => console.error('Status polling failed')), 5000);
    const port = Number(process.env.PORT || 3333);
    monitor.app.listen(port, '127.0.0.1', () => console.log(`Fleet Monitor: http://127.0.0.1:${port} (${process.env.FLEET_MODE === 'live' ? 'connected fleet' : 'example activity'})`));
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = {createMonitor, initialState, updateStatus};
