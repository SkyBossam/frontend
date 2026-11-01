import type { CryEvent, Feedback } from './domain.ts';

/** The response may be attached to an earlier occurrence in the displayed alert. */
export function cryRecordFeedback(event: CryEvent, cries: CryEvent[], feedback: Feedback[], grouped = false): Feedback | undefined {
  const ids = new Set([event.id]);
  if (grouped && event.alertId) {
    for (const candidate of cries) {
      if (candidate.childId === event.childId && candidate.sourceId === event.sourceId && candidate.alertId === event.alertId) ids.add(candidate.id);
    }
  }
  return feedback.filter(f => f.childId === event.childId && ids.has(f.eventId))
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))[0];
}

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
