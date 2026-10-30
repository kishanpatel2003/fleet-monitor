const test = require('node:test');
const assert = require('node:assert/strict');
const {createMonitor, initialState, updateStatus} = require('../server');

test('status duration resets on transitions and last-active survives rest', () => {
  const state = initialState(1000);
  updateStatus(state, 'builder', true, 2000);
  updateStatus(state, 'builder', true, 3000);
  assert.equal(state.builder.since, 2000);
  updateStatus(state, 'builder', false, 4000);
  assert.equal(state.builder.since, 4000);
  assert.equal(state.builder.lastActive, 3000);
});

test('demo endpoint exposes only generic activity without host access', async t => {
  const monitor = createMonitor({env: {FLEET_MODE: 'demo'}, now: () => 50000});
  await monitor.poll();
  const server = monitor.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/status`);
  const data = await response.json();
  assert.equal(data.mode, 'demo');
  assert.deepEqual(Object.keys(data.agents), ['operator', 'coordinator', 'researcher', 'builder']);
  assert.equal(data.agents.coordinator.status, 'active');
  assert.equal(data.agents.coordinator.duration, 0);
});
