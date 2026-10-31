import test from 'node:test';
import assert from 'node:assert/strict';
import { currentSnapshot, eventLabel, type SkySnapshot } from '../src/skyEye.ts';

function fixture(): SkySnapshot {
  const at = '2026-11-01T00:00:00Z';
  return { childId: 'child-a', serverTime: at, items: [{ deviceId: 'pi-a', name: '아이쿠', connected: true,
    status: { observedAt: at, video: { available: true, observedAt: at, posture: 'supine', airway: 'airway_visible', state: 'normal', geometryValid: false, fallState: 'unavailable', fps: 4 }, audio: { available: true, observedAt: at, cryDetected: true, babyCryScore: .4, cryingScore: .3 }, personalization: { state: 'ready', simulation: false, nFeedback: 10, requiredFeedback: 10, cryWindows: 10, requiredCryWindows: 10, soundOn: false, recommendations: [{ action: 'hold', score: .6 }], recentEpisodes: [] } },
    safety: { posture: 'stable', face: 'stable', objects: 'unknown', edge: 'unknown' }, events: [{ recent: true, event: { id: 'event-a', episodeKey: 'source-a:episode-a', kind: 'risk_ended', riskType: 'prone', observedAt: at, episodeUid: null, endReason: null } }], commands: [] }] };
}
test('fresh observations survive a skewed client clock but expire without a response', () => {
  const snapshot = fixture(); const received = 100;
  assert.equal(currentSnapshot(snapshot, received, 1100)?.items[0].safety.posture, 'stable');
  const expired = currentSnapshot(snapshot, received, 9100)!.items[0];
  assert.equal(expired.safety.posture, 'unknown'); assert.equal(expired.status.video.available, false);
  assert.equal(expired.status.audio.cryDetected, false); assert.equal(expired.status.personalization, null);
  assert.equal(currentSnapshot(snapshot, received, 16100)?.items[0].connected, false);
  assert.equal(snapshot.items[0].safety.posture, 'stable');
});
test('simulation and incomplete feedback/window gates cannot show real hints', () => {
  for (const field of ['nFeedback', 'cryWindows'] as const) {
    const snapshot = fixture(); snapshot.items[0].status.personalization![field] = 9;
    assert.deepEqual(currentSnapshot(snapshot, 0, 0)?.items[0].status.personalization?.recommendations, []);
  }
  const snapshot = fixture(); snapshot.items[0].status.personalization!.simulation = true;
  assert.equal(currentSnapshot(snapshot, 0, 0)?.items[0].status.personalization, null);
});
test('old events stop appearing as recent and model end is not caregiver resolution', () => {
  const snapshot = fixture();
  assert.equal(currentSnapshot(snapshot, 0, 31000)?.items[0].events[0].recent, false);
  assert.match(eventLabel(snapshot.items[0].events[0].event), /모델 위험 구간 종료/);
  assert.equal(currentSnapshot(null, 0, 0), null);
});
