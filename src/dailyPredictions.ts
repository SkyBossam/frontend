import { actionLabels, koreaDate, type CryEvent, type Feedback } from './domain.ts';

const DAY = 86400000;
const KST = 9 * 3600000;
export interface PredictionPeriod {
  startMinute: number;
  endMinute: number;
  actions: string[];
  reason: 'predicted' | 'insufficient' | 'mixed';
  days: number;
  successes: number;
}
interface Evidence { id: string; day: string; actions: string[]; slot: number }

export const predictionTime = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export const predictionActionLabel = (action: string) => action.startsWith('other:') ? action.slice(6) : actionLabels[action] || action;

/** Local KST calendar days, including the selected day up to now. Never infer sleep from an environment adjustment. */
export function predictDailyCare(cries: CryEvent[], feedback: Feedback[], childId: string, date: string, now = Date.now()) {
  const dayStart = Date.parse(`${date}T00:00:00+09:00`);
  if (!Number.isFinite(dayStart)) return { fromDate: '', throughDate: date, periods: [] as PredictionPeriod[] };
  const start = dayStart - 6 * DAY;
  const end = Math.min(dayStart + DAY, now + 1);
  const events = new Map(cries.filter(e => e.childId === childId).map(e => [e.id, e]));
  // One final response per alert, even if several physical detections share that alert.
  const responses = new Map<string, { event: CryEvent; response: Feedback['response']; actions: string[]; at: number }>();
  for (const item of feedback) {
    if (item.childId !== childId) continue;
    const event = events.get(item.eventId);
    if (!event) continue;
    const detected = Date.parse(event.startedAt);
    if (!Number.isFinite(detected) || detected < start || detected >= end) continue;
    const attempts = [...(item.history || []), { ...item, createdAt: item.updatedAt || item.createdAt }]
      .map(attempt => ({ ...attempt, at: Date.parse(attempt.createdAt) }))
      .filter(attempt => Number.isFinite(attempt.at) && attempt.at >= detected && attempt.at < end)
      .sort((a, b) => b.at - a.at);
    const latest = attempts[0];
    if (!latest) continue;
    const key = event.alertId || event.id;
    if ((responses.get(key)?.at ?? -Infinity) <= latest.at) responses.set(key, { event, ...latest });
  }
  const evidence: Evidence[] = [];
  for (const [id, record] of responses) {
    if (record.response !== 'stopped' || record.actions.includes('none')) continue;
    const actions = [...new Set(record.actions.map(action => action.startsWith('other:') ? `other:${action.slice(6).trim()}` : action))].sort();
    // Do not turn unknown actions or a combined intervention into a single purported cause.
    if (!actions.length || actions.some(action => !Object.hasOwn(actionLabels, action) && !/^other:.+/.test(action) || action === 'other')) continue;
    const detected = Date.parse(record.event.startedAt);
    const minutes = Math.floor(((detected + KST) % DAY) / 60000);
    evidence.push({ id, day: koreaDate(new Date(detected)), actions, slot: Math.floor(minutes / 30) });
  }
  const segments: (PredictionPeriod & { evidence: Evidence[] })[] = [];
  for (let slot = 0; slot < 48; slot++) {
    const groups = new Map<string, Evidence[]>();
    for (const item of evidence.filter(item => item.slot === slot)) {
      const key = JSON.stringify(item.actions);
      groups.set(key, [...(groups.get(key) || []), item]);
    }
    const ranked = [...groups.values()].map(items => ({ items, days: new Set(items.map(item => item.day)).size }))
      .sort((a, b) => b.days - a.days);
    const best = ranked[0];
    const enough = best && best.days >= 2;
    const tied = enough && ranked[1]?.days === best.days;
    const reason = !enough ? 'insufficient' : tied ? 'mixed' : 'predicted';
    const chosen = reason === 'predicted' ? best.items : [];
    const actions = chosen[0]?.actions || [];
    const previous = segments.at(-1);
    if (previous && previous.reason === reason && JSON.stringify(previous.actions) === JSON.stringify(actions)) {
      previous.endMinute += 30;
      previous.evidence.push(...chosen);
    } else {
      segments.push({ startMinute: slot * 30, endMinute: (slot + 1) * 30, actions, reason, days: 0, successes: 0, evidence: [...chosen] });
    }
  }
  return {
    fromDate: koreaDate(new Date(start)), throughDate: date,
    periods: segments.map(({ evidence: items, ...period }) => ({ ...period, days: new Set(items.map(item => item.day)).size, successes: new Set(items.map(item => item.id)).size })),
  };
}
