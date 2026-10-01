import { test, describe } from 'node:test';
import { applyFilters, defaultSettings } from '../src/filters.mjs';
import { ShiftMonitor } from '../src/monitor.mjs';
import { dashboardMessage, shiftAlertMessage, handleCallback } from '../src/telegram.mjs';

// The same tests as npm test, but collected as JSON for the web page.
export async function runChecks() {
  const started = Date.now();
  const results = [];
  const check = async (title, fn) => {
    try { await fn(); results.push({ title, pass: true }); }
    catch (e) { results.push({ title, pass: false, detail: e.message }); }
  };
  const eq = (a, b, m) => { if (a !== b) throw new Error(m || `expected ${b}, got ${a}`); };

  const SHIFTS = [
    { id: '1', location: 'Brampton Warehouse A', payRate: 18, day: 'Monday', timeSlot: 'morning' },
    { id: '2', location: 'Mississauga DC', payRate: 21, day: 'Tuesday', timeSlot: 'night' },
    { id: '3', location: 'Brampton Warehouse B', payRate: 16, day: 'Wednesday', timeSlot: 'morning' },
    { id: '4', location: 'Scarborough Hub', payRate: 22, day: 'Monday', timeSlot: 'afternoon' },
  ];

  await check('No filters returns all shifts', () => eq(applyFilters(SHIFTS, {}).length, 4));
  await check('Location filter is case-insensitive and partial', () => { const r = applyFilters(SHIFTS, { location: 'brampton' }); eq(r.length, 2); });
  await check('Min pay drops shifts below threshold', () => { const r = applyFilters(SHIFTS, { minPay: '20' }); eq(r.length, 2); });
  await check('Day of week accepts comma-separated list', () => eq(applyFilters(SHIFTS, { dayOfWeek: 'Monday, Wednesday' }).length, 3));
  await check('Multiple filters combine with AND', () => { const r = applyFilters(SHIFTS, { location: 'brampton', minPay: '17' }); eq(r.length, 1); eq(r[0].id, '1'); });
  await check('Empty filter values are ignored', () => eq(applyFilters(SHIFTS, { location: '', minPay: '' }).length, 4));

  await check('New shifts trigger callback, seen shifts do not', async () => {
    const alerts = []; let call = 0;
    const m = new ShiftMonitor({ scrapeFn: async () => { call++; return call === 1 ? [{ id: 'a' }, { id: 'b' }] : [{ id: 'b' }, { id: 'c' }]; }, onNewShifts: async (s) => alerts.push(...s) });
    await m.check(); eq(alerts.length, 2); await m.check(); eq(alerts.length, 3); eq(alerts[2].id, 'c');
  });
  await check('Scrape errors increment error count without crashing', async () => {
    const m = new ShiftMonitor({ scrapeFn: async () => { throw new Error('down'); }, onNewShifts: async () => {}, onError: () => {} });
    await m.check(); eq(m.stats.errors, 1);
  });
  await check('Seen set is capped at maxHistory', async () => {
    let n = 0; const m = new ShiftMonitor({ maxHistory: 5, scrapeFn: async () => [{ id: String(n++) }], onNewShifts: async () => {} });
    for (let i = 0; i < 10; i++) await m.check(); if (m.seen.size > 5) throw new Error('not capped');
  });

  const stats = { checks: 12, found: 5, errors: 1, lastCheck: new Date() };
  await check('Dashboard message includes stats and keyboard', () => { const msg = dashboardMessage(stats, defaultSettings()); if (!msg.text.includes('12')) throw new Error('missing'); if (!msg.reply_markup) throw new Error('no keyboard'); });
  await check('Shift alert has Apply and Skip buttons', () => { const msg = shiftAlertMessage({ id: '42', location: 'Brampton', payRate: 19 }); const btns = msg.reply_markup.inline_keyboard.flat(); if (!btns.some(b => b.callback_data === 'apply_42')) throw new Error('no apply'); });
  await check('Toggle pause flips the state', () => { const s = defaultSettings(); handleCallback('toggle_pause', stats, s); eq(s.paused, true); });
  await check('Interval button updates check frequency', () => { const s = defaultSettings(); handleCallback('interval_5', stats, s); eq(s.checkIntervalMin, 5); });
  await check('Clear filters empties all filters', () => { const s = defaultSettings(); s.filters = { location: 'x' }; handleCallback('clear_filters', stats, s); eq(Object.keys(s.filters).length, 0); });

  return { passed: results.filter(r => r.pass).length, total: results.length, ms: Date.now() - started, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await runChecks();
  for (const r of out.results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.title}`);
  console.log(`\n${out.passed}/${out.total} in ${out.ms} ms`);
  process.exit(out.passed === out.total ? 0 : 1);
}
