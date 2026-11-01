import test from 'node:test';
import assert from 'node:assert/strict';
import { cryRecordFeedback, groupCryRecords, pendingCryAlerts } from '../src/cryAlerts.ts';
import { emptyData, saveFeedback, type CryEvent, type Feedback } from '../src/domain.ts';
import { careChanges, applySavedCare } from '../src/careHistory.ts';
const event: CryEvent = { id: 'cry', childId: 'child', sourceId: 'camera', startedAt: '2026-11-01T00:00:00Z', cause: '', analysisAvailable: false };
const response: Feedback = { eventId: event.id, childId: event.childId, actions: ['hug'], note: '', response: 'continues', createdAt: '2026-11-01T00:01:00Z', version: 1 };
test('one waiting alert per source; reading or continued crying does not clear it', () => {
  const older = { ...event, id: 'older', startedAt: '2026-10-31T23:00:00Z' };
  const other = { ...event, id: 'other', childId: 'other' };
  for (const feedback of [[], [response], [{ ...response, response: 'reduced' as const }], [{ ...response, response: 'unknown' as const }]]) {
    assert.deepEqual(pendingCryAlerts([older, event, other], feedback, 'child'), [event]);
  }
  assert.deepEqual(pendingCryAlerts([older, event], [{ ...response, response: 'stopped' }], 'child'), []);
  const next = { ...event, id: 'next', startedAt: '2026-11-01T01:00:00Z' };
  assert.deepEqual(pendingCryAlerts([older, event, next], [{ ...response, response: 'stopped' }], 'child'), [next]);
});
test('a second device retains its own waiting cry', () => {
  assert.equal(pendingCryAlerts([event, { ...event, id: 'second', sourceId: 'second-camera' }], [], 'child').length, 2);
});
test('follow-up response carries the saved version and retains earlier care actions', () => {
  const data = { ...emptyData(), child: { id: 'child', name: 'Baby', birthDate: '2026-01-01' }, cries: [event], feedback: [response] };
  const next = saveFeedback(data, { ...response, response: 'stopped', actions: ['diaper'], createdAt: '2026-11-01T00:02:00Z' });
  assert.equal(next.feedback[0].history?.[0].response, 'continues');
  assert.deepEqual(next.feedback[0].history?.[0].actions, ['hug']);
  const changes = careChanges(data, next);assert.equal(changes.feedback[0].version, 1);assert.equal(changes.feedback[0].response, 'stopped');
  const saved = applySavedCare(next, { routines: [], sleepRecords: [], feedback: [{ ...next.feedback[0], version: 2 }] });
  assert.equal(saved.feedback[0].version, 2);
  assert.throws(() => saveFeedback(saved, { ...response, response: 'unknown' }), /바뀌었/);
});

test('two occurrences share one alert, later rearmed group remains independent', () => {
  const first = { ...event, alertId: 'group1' };
  const second = { ...first, id: 'second', startedAt: '2026-11-01T00:05:00Z' };
  assert.deepEqual(pendingCryAlerts([first,second], [], 'child'), [second]);
  assert.deepEqual(pendingCryAlerts([first,second], [{ ...response, response: 'stopped' }], 'child'), []);
  const third = { ...second, id: 'third', alertId: 'group2' };
  assert.deepEqual(pendingCryAlerts([first,second,third], [{ ...response, response: 'stopped' }], 'child'), [third]);
  assert.deepEqual(pendingCryAlerts([{...first, alertClosed:true},{...second,alertClosed:true}], [], 'child'), []);
});

test('record lists collapse one response group while preserving every physical interval', () => {
  const first = { ...event, alertId: 'pending', durationSec: 1 };
  const second = { ...first, id: 'second', startedAt: '2026-11-01T00:00:20Z', durationSec: 5 };
  const third = { ...second, id: 'third', startedAt: '2026-11-01T00:01:00Z' };
  const groups = groupCryRecords([first, third, second]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].latest.id, 'third');
  assert.deepEqual(groups[0].events.map(e => e.durationSec), [5,5,1]);
  assert.equal(groupCryRecords([first,{...second,alertId:'handled'}]).length,2);
  assert.equal(groupCryRecords([first,{...second,childId:'another-child'}]).length,2);
  assert.equal(groupCryRecords([first,{...second,sourceId:'another-pi'}]).length,2);
  assert.equal(groupCryRecords([{...first,alertId:undefined},{...second,alertId:undefined}]).length,2);
});

test('grouped care summary finds earlier successful response but isolates other children/devices', () => {
  const first = { ...event, alertId: 'alert' };
  const latest = { ...first, id: 'latest' };
  const success: Feedback = { ...response, response: 'stopped' };
  assert.equal(cryRecordFeedback(latest, [first, latest], [success], true), success);
  assert.equal(cryRecordFeedback(latest, [first, latest], [success]), undefined);
  assert.equal(cryRecordFeedback(latest, [{ ...first, childId: 'other' }], [success], true), undefined);
  assert.equal(cryRecordFeedback(latest, [{ ...first, sourceId: 'other' }], [success], true), undefined);
  const updated: Feedback = { ...response, eventId: latest.id, response: 'continues', updatedAt: '2026-11-01T00:03:00Z' };
  assert.equal(cryRecordFeedback(latest, [first, latest], [success, updated], true), updated);
});
