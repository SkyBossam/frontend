import type { CryEvent } from './domain.ts';

export interface ObservedCry { childId: string; deviceId: string; observedAt: string }

/** Resolve the clicked observation, even if it has ended while history was loading. */
export function findObservedCry(cries: CryEvent[], target: ObservedCry): CryEvent | undefined {
  const at = Date.parse(target.observedAt);
  if (!Number.isFinite(at)) return undefined;
  return cries.filter(event => {
    if (event.childId !== target.childId || event.sourceId !== target.deviceId) return false;
    const start = Date.parse(event.startedAt);
    const end = event.endedAt ? Date.parse(event.endedAt) : event.durationSec !== undefined ? start + event.durationSec * 1000 : Infinity;
    return start <= at && end >= at && !!event.lastObservedAt && Date.parse(event.lastObservedAt) >= at - 8000;
  }).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}
