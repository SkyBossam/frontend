import assert from 'node:assert/strict';
import test from 'node:test';
import { findObservedCry } from '../src/cryNavigation.ts';
import type { CryEvent } from '../src/domain.ts';

const time = (seconds: number) => new Date(Date.UTC(2026, 10, 1, 0, 0, seconds)).toISOString();
const target = { childId: 'child', deviceId: 'pi', observedAt: time(20) };
const event = (changes: Partial<CryEvent> = {}): CryEvent => ({
  id: 'clicked-cry', childId: 'child', sourceId: 'pi', startedAt: time(10),
  lastObservedAt: time(20), cause: 'unknown', analysisAvailable: false, ...changes,
});

test('opens the clicked observation, not a newer cry received while loading', () => {
  const clicked = event({ endedAt: time(25), durationSec: 15 });
  const newer = event({ id: 'newer', startedAt: time(30), lastObservedAt: time(35) });
  assert.equal(findObservedCry([newer, clicked], target)?.id, clicked.id);
});

test('waits for missing or stale records and resolves after history refresh', () => {
  assert.equal(findObservedCry([], target), undefined);
  assert.equal(findObservedCry([event({ lastObservedAt: time(11) })], target), undefined);
  assert.equal(findObservedCry([event()], target)?.id, 'clicked-cry');
});

test('never matches another child or device', () => {
  assert.equal(findObservedCry([
    event({ childId: 'other-child' }), event({ sourceId: 'other-pi' }),
  ], target), undefined);
});

test('does not treat a completed interval as ongoing when only duration is present', () => {
  assert.equal(findObservedCry([event({ durationSec: 5 })], target), undefined);
  assert.equal(findObservedCry([event({ durationSec: 15 })], target)?.id, 'clicked-cry');
});

test('invalid observation timestamps do not select a record', () => {
  assert.equal(findObservedCry([event()], { ...target, observedAt: 'invalid' }), undefined);
});

test('server record ID resolves the exact occurrence despite later status changes', () => {
  const linked = { ...target, recordId: 'clicked-cry' };
  assert.equal(findObservedCry([event({lastObservedAt: time(10), endedAt: time(15)})], linked)?.id, 'clicked-cry');
  assert.equal(findObservedCry([event({id: 'unrelated'})], linked), undefined);
  assert.equal(findObservedCry([event({childId: 'other'})], linked), undefined);
  assert.equal(findObservedCry([event({sourceId: 'other'})], linked), undefined);
});
