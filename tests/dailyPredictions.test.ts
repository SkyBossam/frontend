import assert from 'node:assert/strict';
import test from 'node:test';
import { predictDailyCare, predictionTime, predictionActionLabel } from '../src/dailyPredictions.ts';
import type { CryEvent, Feedback } from '../src/domain.ts';

const now = Date.parse('2026-11-01T23:59:59+09:00');
function records() {
  const cries: CryEvent[] = [];
  const feedback: Feedback[] = [];
  const add = (id: string, day: string, time: string, actions = ['feed'], response: Feedback['response'] = 'stopped', alertId?: string) => {
    const at = `${day}T${time}:00+09:00`;
    cries.push({ id, childId: 'child', startedAt: at, cause: '', analysisAvailable: false, alertId });
    feedback.push({ eventId: id, childId: 'child', actions, response, note: '', createdAt: at });
  };
  const predict = (date = '2026-11-01', clock = now) => predictDailyCare(cries, feedback, 'child', date, clock);
  return { cries, feedback, add, predict };
}

test('merges adjacent matching half hours and covers the whole day without gaps', () => {
  const r = records();
  for (const day of ['2026-10-30', '2026-10-31']) {
    for (const time of ['13:00', '13:30', '14:00']) r.add(day + time, day, time, ['sleep']);
  }
  const result = r.predict();
  assert.equal(result.fromDate, '2026-10-26');
  assert.deepEqual(result.periods.map(p => [p.startMinute, p.endMinute, p.actions]), [
    [0, 780, []], [780, 870, ['sleep']], [870, 1440, []],
  ]);
  assert.equal(result.periods[1].successes, 6);
  assert.equal(result.periods[1].days, 2);
  assert.equal(predictionTime(1440), '24:00');
  assert.equal(predictionActionLabel('sleep'), '수면 환경 조정하기');
});

test('does not bridge missing slots or different actions', () => {
  const r = records();
  for (const day of ['2026-10-30', '2026-10-31']) {
    r.add(day + 'a', day, '13:00');
    r.add(day + 'b', day, '14:00');
    r.add(day + 'c', day, '14:30', ['hug']);
  }
  assert.deepEqual(r.predict().periods.filter(p => p.reason === 'predicted').map(p => [p.startMinute, p.endMinute]), [[780,810], [840,870], [870,900]]);
});

test('requires distinct successful days, excludes reduced/continuing/unknown/no-action outcomes', () => {
  const r = records();
  for (let i = 0; i < 5; i++) r.add('same-day-' + i, '2026-10-31', '13:10');
  for (const response of ['reduced', 'continues', 'unknown'] as const) r.add(response, '2026-10-30', '13:10', ['feed'], response);
  r.add('none', '2026-10-30', '13:10', ['none']);
  assert.ok(r.predict().periods.every(p => p.reason === 'insufficient'));
});

test('selects the action effective on most days, withholding ties', () => {
  const r = records();
  for (const day of ['2026-10-30', '2026-10-31']) {
    r.add(day + 'feed', day, '13:10');
    r.add(day + 'hug', day, '13:10', ['hug']);
  }
  assert.equal(r.predict().periods.find(p => p.startMinute === 780)?.reason, 'mixed');
  r.add('third', '2026-10-29', '13:10', ['hug']);
  assert.deepEqual(r.predict().periods.find(p => p.startMinute === 780)?.actions, ['hug']);
});

test('keeps combined interventions together, normalizing order and duplicate selections', () => {
  const r = records();
  r.add('one', '2026-10-30', '13:00', ['hug', 'feed', 'hug']);
  r.add('two', '2026-10-31', '13:00', ['feed', 'hug']);
  assert.deepEqual(r.predict().periods.find(p => p.reason === 'predicted')?.actions, ['feed', 'hug']);
});

test('uses KST half-hour boundaries and the inclusive seven-calendar-day window', () => {
  const r = records();
  r.add('boundary', '2026-10-26', '00:00');
  r.add('second', '2026-10-27', '00:10');
  r.cries[1].startedAt = '2026-10-26T15:10:00Z';
  r.add('too-old', '2026-10-25', '00:00', ['hug']);
  r.add('future', '2026-11-02', '00:00', ['hug']);
  assert.deepEqual(r.predict().periods[0], { startMinute: 0, endMinute: 30, actions: ['feed'], reason: 'predicted', days: 2, successes: 2 });
});

test('does not mix children or use orphaned feedback', () => {
  const r = records();
  r.add('one', '2026-10-30', '13:00');
  r.add('two', '2026-10-31', '13:00');
  r.cries[1].childId = 'other';
  r.feedback.push({ ...r.feedback[0], eventId: 'missing' });
  assert.ok(r.predict().periods.every(p => p.reason === 'insufficient'));
  r.cries[1].childId = 'child'; r.feedback[1].childId = 'other';
  assert.ok(r.predict().periods.every(p => p.reason === 'insufficient'));
});

test('counts an alert once and uses its latest response rather than older success', () => {
  const r = records();
  r.add('one', '2026-10-30', '13:00', ['feed'], 'stopped', 'shared');
  r.add('two', '2026-10-31', '13:00', ['feed'], 'stopped', 'shared');
  assert.ok(r.predict().periods.every(p => p.reason === 'insufficient'));
  r.add('third', '2026-10-29', '13:00');
  assert.equal(r.predict().periods.find(p => p.reason === 'predicted')?.successes, 2);
  r.feedback[1].response = 'continues';
  assert.ok(r.predict().periods.every(p => p.reason === 'insufficient'));
});

test('past date uses feedback known by that date; future records cannot leak into prediction', () => {
  const r = records();
  r.add('one', '2026-10-30', '13:00');
  r.add('two', '2026-10-31', '13:00');
  r.feedback[1].history = [{ actions: ['feed'], response: 'stopped', note: '', createdAt: r.feedback[1].createdAt }];
  r.feedback[1].updatedAt = '2026-11-01T15:00:00+09:00';
  r.feedback[1].response = 'continues';
  assert.ok(r.predict('2026-10-31').periods.some(p => p.reason === 'predicted'));
  assert.ok(r.predict().periods.every(p => p.reason === 'insufficient'));
});

test('empty/invalid input is safe and unsupported action codes never become predictions', () => {
  const r = records();
  assert.deepEqual(r.predict().periods, [{ startMinute: 0, endMinute: 1440, actions: [], reason: 'insufficient', days: 0, successes: 0 }]);
  assert.deepEqual(r.predict('invalid').periods, []);
  r.add('one', '2026-10-30', '13:00', ['invalid']);
  r.add('two', '2026-10-31', '13:00', ['invalid']);
  assert.ok(r.predict().periods.every(p => p.reason === 'insufficient'));
});
