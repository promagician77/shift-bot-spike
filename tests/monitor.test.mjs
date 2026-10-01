import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShiftMonitor } from '../src/monitor.mjs';

test('new shifts trigger the callback, seen shifts do not', async () => {
  const alerts = [];
  let call = 0;
  const monitor = new ShiftMonitor({
    intervalMs: 999999, // manual checks only
    scrapeFn: async () => {
      call++;
      if (call === 1) return [{ id: 'a' }, { id: 'b' }];
      if (call === 2) return [{ id: 'b' }, { id: 'c' }]; // b is seen, c is new
      return [];
    },
    onNewShifts: async (s) => alerts.push(...s),
  });
  await monitor.check();
  assert.equal(alerts.length, 2);
  await monitor.check();
  assert.equal(alerts.length, 3);
  assert.equal(alerts[2].id, 'c');
  assert.equal(monitor.stats.checks, 2);
  assert.equal(monitor.stats.found, 3);
});

test('scrape errors increment the error count and do not crash', async () => {
  const errors = [];
  const monitor = new ShiftMonitor({
    scrapeFn: async () => { throw new Error('site down'); },
    onNewShifts: async () => {},
    onError: (e) => errors.push(e.message),
  });
  await monitor.check();
  assert.equal(monitor.stats.errors, 1);
  assert.equal(errors[0], 'site down');
});

test('seen set is capped at maxHistory', async () => {
  let n = 0;
  const monitor = new ShiftMonitor({
    maxHistory: 5,
    scrapeFn: async () => [{ id: String(n++) }],
    onNewShifts: async () => {},
  });
  for (let i = 0; i < 10; i++) await monitor.check();
  assert.ok(monitor.seen.size <= 5);
  assert.equal(monitor.stats.found, 10);
});
