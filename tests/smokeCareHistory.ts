// Opt-in against the local Vite proxy and running backend. Uses a synthetic account only.
import assert from 'node:assert/strict';
import { DeviceClient } from '../src/api/deviceClient.ts';
import { applySavedCare, careChanges, loadCareRecords } from '../src/careHistory.ts';
import { emptyData, type AppData } from '../src/domain.ts';

const api = new DeviceClient('http://127.0.0.1:5173');
const username = `history_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`, password = crypto.randomUUID();
await api.authenticate('signup', username, password);
const workspace = (await api.workspaces()).items[0].id;
const child = await api.createChild(workspace, 'Frontend history fixture', '2026-01-01', crypto.randomUUID());
let state: AppData = { ...emptyData(), child: { id: child.id, name: child.displayName, birthDate: child.birthDate } };
try {
  const next: AppData = { ...state,
    routines: [{ id: crypto.randomUUID(), childId: child.id, type: 'play', title: '기록 저장 확인', date: '2026-01-20', time: '14:00', endTime: '14:30', status: 'done' }],
    sleepRecords: [{ id: crypto.randomUUID(), childId: child.id, startedAt: '2026-01-20T14:00:00Z', endedAt: '2026-01-20T16:00:00Z' }],
  };
  const saved = await api.saveCareHistory(workspace, child.id, careChanges(state, next), crypto.randomUUID());
  state = applySavedCare(next, saved);
  assert.equal(state.routines[0].version, 1);
  await api.logout(); await api.authenticate('login', username, password);
  const records = await loadCareRecords(api, workspace, child.id);
  assert.deepEqual(records.routines, state.routines); assert.deepEqual(records.sleepRecords, state.sleepRecords);
  const edited = { ...state, routines: [{ ...state.routines[0], title: '수정한 기록' }] };
  const updated = await api.saveCareHistory(workspace, child.id, careChanges(state, edited), crypto.randomUUID());
  assert.equal(updated.routines[0].version, 2);
  console.log('PASS: frontend adapter -> Vite proxy -> DB -> logout/login -> restored daily records -> versioned edit.');
} finally { await api.logout(); }
