import { groupCryRecords } from '../cryAlerts';
import type { CryEvent } from '../domain';
import { CryRow } from './Overview';

export function CryRecordList({ events, limit }: { events: CryEvent[]; limit?: number }) {
  const groups = groupCryRecords(events);
  return <div className="cry-record-groups">{groups.slice(0, limit ?? groups.length).map(group => <div className="cry-record-group" key={group.key}>
    <CryRow event={group.latest} grouped/>
  </div>)}</div>;
}
