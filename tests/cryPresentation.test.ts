import test from 'node:test';
import assert from 'node:assert/strict';
import { cryGuidance, cryResult, observationLabel } from '../src/cryPresentation.ts';
import type { CryEvent } from '../src/domain.ts';
const event: CryEvent = { id:'one',childId:'child',startedAt:'2026-11-01T00:00:00Z',cause:'원인 미분류',analysisAvailable:false };
test('real cry detection does not fabricate causes and guidance needs no caregiver history', () => {
  assert.equal(cryResult({observedAt:event.startedAt,cryDetected:true,babyCryScore:0.4,cryingScore:0.1}), '아기 울음 감지');
  assert.equal(cryResult({observedAt:event.startedAt,cryDetected:true,babyCryScore:0.1,cryingScore:0.5}), '울음 신호 감지');
  assert.ok(cryGuidance(event).length > 0);
  assert.equal(observationLabel({...event,observationState:'interrupted'}),'관측 중단 · 종료 미확인');
  assert.equal(observationLabel({...event,durationSec:62}),'울음 1분 2초 · 구간 종료');
});
