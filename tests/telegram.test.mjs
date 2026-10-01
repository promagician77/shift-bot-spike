import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardMessage, shiftAlertMessage, handleCallback } from '../src/telegram.mjs';
import { defaultSettings } from '../src/filters.mjs';

const stats = { checks: 12, found: 5, errors: 1, lastCheck: new Date() };

test('dashboard message includes stats and inline keyboard', () => {
  const msg = dashboardMessage(stats, defaultSettings());
  assert.ok(msg.text.includes('Checks: 12'));
  assert.ok(msg.reply_markup.inline_keyboard.length >= 3);
  assert.ok(msg.reply_markup.inline_keyboard.flat().some((b) => b.callback_data === 'settings'));
});

test('shift alert has Apply and Skip buttons', () => {
  const msg = shiftAlertMessage({ id: '42', location: 'Brampton', payRate: 19, day: 'Mon', timeSlot: 'morning' });
  assert.ok(msg.text.includes('Brampton'));
  const btns = msg.reply_markup.inline_keyboard.flat();
  assert.ok(btns.some((b) => b.callback_data === 'apply_42'));
  assert.ok(btns.some((b) => b.callback_data === 'skip_42'));
});

test('toggle_pause flips the paused state', () => {
  const s = defaultSettings();
  assert.equal(s.paused, false);
  const msg = handleCallback('toggle_pause', stats, s);
  assert.equal(s.paused, true);
  assert.ok(msg.text.includes('Paused'));
});

test('interval buttons update the check interval', () => {
  const s = defaultSettings();
  handleCallback('interval_5', stats, s);
  assert.equal(s.checkIntervalMin, 5);
});

test('clear_filters empties all filters', () => {
  const s = defaultSettings();
  s.filters = { location: 'Brampton', minPay: '18' };
  handleCallback('clear_filters', stats, s);
  assert.deepEqual(s.filters, {});
});
