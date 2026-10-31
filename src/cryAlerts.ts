import type { CryEvent, Feedback } from './domain.ts';

/** One waiting alert per bound device. Older records remain in the history list. */
export function pendingCryAlerts(cries: CryEvent[], feedback: Feedback[], childId: string): CryEvent[] {
  const newest = new Map<string, CryEvent>();
  for (const event of [...cries].filter(e => e.childId === childId).sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id))) {
    const source = event.sourceId || event.id;
    if (!newest.has(source)) newest.set(source, event);
  }
  return [...newest.values()].filter(event => !feedback.some(f => f.eventId === event.id && f.childId === childId && f.response === 'stopped'));
}
