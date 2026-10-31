import { koreaDate, timeLabel, type AppData, type CryEvent, type Feedback, type Routine, type SleepRecord } from './domain.ts';
import type { DeviceClient } from './api/deviceClient.ts';

export type HistoryKind = 'cries' | 'routines' | 'sleepRecords' | 'feedback';
export type CareRecords = Pick<AppData, HistoryKind>;
export interface ServerRoutine {
  id: string; childId: string; version: number; type: Routine['type']; title: string; note: string | null;
  scheduledAt: string | null; endedAt: string | null; status: Routine['status'];
}
export interface RoutineWrite {
  id: string; version?: number; type: Routine['type']; title: string; note: string;
  scheduledAt: string; endedAt: string | null; status: Routine['status'];
}
export interface CareChanges {
  routines: RoutineWrite[]; deletedRoutines: { id: string; version: number }[];
  sleepRecords: Omit<SleepRecord, 'childId'>[]; deletedSleepRecords: { id: string; version: number }[];
  feedback: Omit<Feedback, 'childId' | 'createdAt'>[];
}
export interface SavedCare { routines: ServerRoutine[]; sleepRecords: SleepRecord[]; feedback: Feedback[] }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

export function routineFromServer(r: ServerRoutine): Routine {
  return { id: r.id, childId: r.childId, version: r.version, type: r.type, title: r.title, note: r.note || '',
    date: r.scheduledAt ? koreaDate(new Date(r.scheduledAt)) : '', time: r.scheduledAt ? timeLabel(r.scheduledAt) : '',
    endTime: r.endedAt ? timeLabel(r.endedAt) : '', endDate: r.endedAt ? koreaDate(new Date(r.endedAt)) : undefined, status: r.status };
}
export function routineToServer(r: Routine): RoutineWrite {
  const start = Date.parse(`${r.date}T${r.time}:00+09:00`);
  let end = r.endTime ? Date.parse(`${r.endDate || r.date}T${r.endTime}:00+09:00`) : null;
  if (end !== null && !r.endDate && end < start) end += 86400000;
  if (!Number.isFinite(start) || (end !== null && (!Number.isFinite(end) || end < start))) throw new Error('루틴의 날짜와 시작·종료 시간을 확인해 주세요.');
  return { id: r.id, version: r.version, title: r.title, type: r.type, note: r.note || '',
    scheduledAt: new Date(start).toISOString(), endedAt: end === null ? null : new Date(end).toISOString(), status: r.status };
}

export async function loadCareRecords(api: DeviceClient, workspace: string, child: string, current = () => true): Promise<CareRecords> {
  async function all<T>(kind: HistoryKind): Promise<T[]> {
    const items: T[] = [], seen = new Set<string>();
    let cursor: string | null = null;
    do {
      if (!current()) throw new Error('기록 조회가 취소됐어요.');
      const page: { items: T[]; nextCursor: string | null } = await api.careHistory<T>(workspace, child, kind, cursor);
      if (!current()) throw new Error('기록 조회가 취소됐어요.');
      items.push(...page.items); cursor = page.nextCursor;
      if (cursor && seen.has(cursor)) throw new Error('기록 목록을 끝까지 읽지 못했어요. 다시 시도해 주세요.');
      if (cursor) seen.add(cursor);
    } while (cursor);
    return items;
  }
  const [cries, routines, sleepRecords, feedback] = await Promise.all([
    all<CryEvent & { durationSec: number | null }>('cries'), all<ServerRoutine>('routines'), all<SleepRecord>('sleepRecords'), all<Feedback>('feedback'),
  ]);
  if ([...cries, ...routines, ...sleepRecords, ...feedback].some(r => r.childId !== child)) throw new Error('아이의 기록 범위를 확인하지 못했어요.');
  return { cries: cries.map(c => ({ ...c, durationSec: c.durationSec ?? undefined })), routines: routines.map(routineFromServer), sleepRecords, feedback };
}

export function careChanges(previous: AppData, next: AppData): CareChanges {
  const child = previous.child?.id;
  if (!child || next.child?.id !== child || previous.demo || next.demo) throw new Error('아이의 기록을 확인해 주세요.');
  if (!same(previous.cries, next.cries)) throw new Error('감지 기록은 연결된 기기에서 자동 저장돼요.');
  const changes: CareChanges = { routines: [], deletedRoutines: [], sleepRecords: [], deletedSleepRecords: [], feedback: [] };
  for (const kind of ['routines', 'sleepRecords'] as const) {
    const before = new Map(previous[kind].map(r => [r.id, r]));
    for (const record of next[kind]) {
      const old = before.get(record.id);
      if (!same(old, record)) {
        if (record.childId !== child || !uuid.test(record.id) || (old && old.childId !== child)) throw new Error('다른 아이의 기록을 변경할 수 없어요.');
        if (old?.version !== undefined && record.version !== old.version) throw new Error('기록이 바뀌었어요. 다시 열어 주세요.');
        if (kind === 'routines') changes.routines.push(routineToServer(record as Routine));
        else { const r = record as SleepRecord; changes.sleepRecords.push({ id: r.id, version: r.version, startedAt: r.startedAt, endedAt: r.endedAt }); }
      }
      before.delete(record.id);
    }
    for (const removed of before.values()) {
      if (removed.childId !== child || removed.version === undefined) throw new Error('서버 기록을 다시 불러온 뒤 삭제해 주세요.');
      changes[kind === 'routines' ? 'deletedRoutines' : 'deletedSleepRecords'].push({ id: removed.id, version: removed.version });
    }
  }
  for (const old of previous.feedback) if (!next.feedback.some(f => same(f, old))) throw new Error('저장된 대응 결과는 덮어쓸 수 없어요.');
  for (const f of next.feedback) if (!previous.feedback.some(old => old.eventId === f.eventId)) {
    if (f.childId !== child || !previous.cries.some(c => c.id === f.eventId && c.childId === child)) throw new Error('해당 울음 기록을 찾을 수 없어요.');
    changes.feedback.push({ eventId: f.eventId, actions: f.actions, note: f.note, response: f.response });
  }
  return changes;
}
export const hasCareChanges = (changes: CareChanges) => Object.values(changes).some(items => items.length > 0);
export function applySavedCare(next: AppData, saved: SavedCare): AppData {
  return { ...next,
    routines: next.routines.map(r => { const value = saved.routines.find(s => s.id === r.id); return value ? routineFromServer(value) : r; }),
    sleepRecords: next.sleepRecords.map(r => saved.sleepRecords.find(s => s.id === r.id) || r),
    feedback: next.feedback.map(f => saved.feedback.find(s => s.eventId === f.eventId) || f),
  };
}

/** Import only genuine UUID records already assigned to this account's selected child. */
export function legacyCareChanges(previous: AppData, records: CareRecords): CareChanges {
  const next = { ...previous, ...records };
  if (!previous.demo && previous.child) {
    next.routines = [...records.routines, ...previous.routines.filter(r => {
      if (r.childId !== previous.child!.id || !uuid.test(r.id) || r.version !== undefined || records.routines.some(s => s.id === r.id)) return false;
      // Old forms allowed an empty time. Keep that original in the local backup,
      // rather than inventing a scheduled time or blocking the whole history feed.
      try { routineToServer(r); return true; } catch { return false; }
    })];
    next.sleepRecords = [...records.sleepRecords, ...previous.sleepRecords.filter(r => r.childId === previous.child!.id && uuid.test(r.id) && r.version === undefined && Number.isFinite(Date.parse(r.startedAt)) && Date.parse(r.endedAt) > Date.parse(r.startedAt) && Date.parse(r.endedAt) <= Date.now() && Date.parse(r.endedAt) - Date.parse(r.startedAt) <= 7 * 86400000 && !records.sleepRecords.some(s => s.id === r.id))];
  }
  return careChanges({ ...previous, ...records }, next);
}
