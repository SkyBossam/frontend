import type { CryEvent, Feedback } from './domain.ts';

/** Group presentation only; physical records and their durations remain intact. */
export function groupCryRecords(cries: CryEvent[]) {
  const groups = new Map<string, CryEvent[]>();
  for (const event of cries) {
    const key = JSON.stringify([event.childId, event.sourceId, event.alertId || event.id]);
    groups.set(key, [...(groups.get(key) || []), event]);
  }
  return [...groups.entries()].map(([key, events]) => {
    events.sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id));
    return { key, events, latest: events[0] };
  }).sort((a, b) => b.latest.startedAt.localeCompare(a.latest.startedAt));
}

/** Physical occurrences remain separate; one card represents each waiting alert. */
export function pendingCryAlerts(cries: CryEvent[], feedback: Feedback[], childId: string): CryEvent[] {
  const groups = new Map<string, CryEvent[]>();
  for (const event of cries.filter(e => e.childId === childId)) {
    const key = event.alertId || event.sourceId || event.id;
    groups.set(key, [...(groups.get(key) || []), event]);
  }
  return [...groups.values()].flatMap(events => {
    events.sort((a,b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id));
    const newest = events[0];
    const handled = newest.alertClosed || feedback.some(f => f.childId === childId && f.response === 'stopped' && (newest.alertId ? events.some(e => e.id === f.eventId) : f.eventId === newest.id));
    return handled ? [] : [newest];
  }).sort((a,b) => b.startedAt.localeCompare(a.startedAt));
}
