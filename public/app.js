(function () {
  const POLL_INTERVAL = 5000;
  const AGENTS = ['operator', 'coordinator', 'researcher', 'builder'];
  const STATUS_EMOJI = { active: '\u{1F7E2}', resting: '\u{1F534}', unknown: '\u{1F7E1}' };

  let cachedData = null;

  function formatDuration(ms) {
    if (!ms || ms < 0) return '—';
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  function formatTimestamp(ts) {
    if (!ts) return 'never';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function updateCard(agentName, agentData) {
    const card = document.getElementById('card-' + agentName);
    if (!card) return;

    const status = agentData.status;
    card.className = 'agent-card ' + status;

    const dot = card.querySelector('.status-dot');
    dot.className = 'status-dot ' + status;

    const text = card.querySelector('.status-text');
    text.textContent = status;

    const duration = card.querySelector('[data-duration]');
    const label = status === 'active' ? 'active for' : status === 'resting' ? 'resting for' : 'unknown for';
    duration.textContent = label + ' ' + formatDuration(agentData.duration);

    const lastActive = card.querySelector('[data-last-active]');
    lastActive.textContent = agentData.lastActive
      ? 'last active: ' + formatTimestamp(agentData.lastActive)
      : '';
  }

  function updateDurations() {
    if (!cachedData) return;
    const now = Date.now();
    for (const name of AGENTS) {
      const agent = cachedData.agents[name];
      if (!agent) continue;
      agent.duration = now - (now - agent.duration + (now - cachedData.timestamp));
      // Recalculate from since
      const elapsed = now - (cachedData.timestamp - agent.duration + (cachedData.timestamp - now));
      // Simpler: just increment by time since last fetch
    }
  }

  // Live duration ticker — recalculates from 'since' timestamps
  function tickDurations() {
    if (!cachedData) return;
    const now = Date.now();
    for (const name of AGENTS) {
      const agent = cachedData.agents[name];
      if (!agent) continue;
      const card = document.getElementById('card-' + name);
      if (!card) continue;
      // Duration = now - since (since = timestamp - original_duration)
      const since = cachedData.timestamp - agent._originalDuration;
      const currentDuration = now - since;
      const label = agent.status === 'active' ? 'active for' : agent.status === 'resting' ? 'resting for' : 'unknown for';
      const duration = card.querySelector('[data-duration]');
      duration.textContent = label + ' ' + formatDuration(currentDuration);
    }
  }

  function drawConnections() {
    const svg = document.getElementById('connections');
    const container = document.getElementById('fleet');
    if (!svg || !container) return;

    const containerRect = container.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);
    svg.innerHTML = '';

    const pairs = [
      ['card-operator', 'card-coordinator'],
      ['card-coordinator', 'card-researcher'],
      ['card-coordinator', 'card-builder']
    ];

    for (const [fromId, toId] of pairs) {
      const from = document.getElementById(fromId);
      const to = document.getElementById(toId);
      if (!from || !to) continue;

      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();

      const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
      const y1 = fromRect.bottom - containerRect.top;
      const x2 = toRect.left + toRect.width / 2 - containerRect.left;
      const y2 = toRect.top - containerRect.top;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      svg.appendChild(line);
    }
  }

  async function fetchStatus() {
    const dot = document.getElementById('refresh-dot');
    try {
      dot.classList.add('polling');
      const res = await fetch('/api/status');
      const data = await res.json();

      // Store original durations for live ticking
      for (const name of AGENTS) {
        if (data.agents[name]) {
          data.agents[name]._originalDuration = data.agents[name].duration;
        }
      }

      cachedData = data;

      for (const name of AGENTS) {
        if (data.agents[name]) {
          updateCard(name, data.agents[name]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch status:', e);
    } finally {
      setTimeout(() => dot.classList.remove('polling'), 500);
    }
  }

  // Initial load
  fetchStatus().then(drawConnections);

  // Poll every 5s
  setInterval(fetchStatus, POLL_INTERVAL);

  // Tick durations every second for live counters
  setInterval(tickDurations, 1000);

  // Redraw connections on resize
  window.addEventListener('resize', drawConnections);
})();
