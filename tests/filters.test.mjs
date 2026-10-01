import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFilters, defaultSettings } from '../src/filters.mjs';

const SHIFTS = [
  { id: '1', location: 'Brampton Warehouse A', payRate: 18, day: 'Monday', timeSlot: 'morning' },
  { id: '2', location: 'Mississauga DC', payRate: 21, day: 'Tuesday', timeSlot: 'night' },
  { id: '3', location: 'Brampton Warehouse B', payRate: 16, day: 'Wednesday', timeSlot: 'morning' },
  { id: '4', location: 'Scarborough Hub', payRate: 22, day: 'Monday', timeSlot: 'afternoon' },
];

test('no filters returns all shifts', () => {
  assert.equal(applyFilters(SHIFTS, {}).length, 4);
});

test('location filter is case-insensitive and partial', () => {
  const r = applyFilters(SHIFTS, { location: 'brampton' });
  assert.equal(r.length, 2);
  assert.ok(r.every((s) => s.location.includes('Brampton')));
});

test('minPay filter drops shifts below the threshold', () => {
  const r = applyFilters(SHIFTS, { minPay: '20' });
  assert.equal(r.length, 2);
  assert.ok(r.every((s) => s.payRate >= 20));
});

test('dayOfWeek accepts a comma-separated list', () => {
  const r = applyFilters(SHIFTS, { dayOfWeek: 'Monday, Wednesday' });
  assert.equal(r.length, 3);
});

test('multiple filters combine with AND', () => {
  const r = applyFilters(SHIFTS, { location: 'brampton', minPay: '17' });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, '1');
});

test('empty filter values are ignored', () => {
  const r = applyFilters(SHIFTS, { location: '', minPay: '' });
  assert.equal(r.length, 4);
});
