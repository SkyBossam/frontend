import { useApp } from '../context';
import { groupCryRecords } from '../cryAlerts';
import { observationLabel } from '../cryPresentation';
import { koreaDate, timeLabel, type CryEvent } from '../domain';
import { CryRow } from './Overview';

export function CryRecordList({ events, limit }: { events: CryEvent[]; limit?: number }) {
  const { go } = useApp();
  const groups = groupCryRecords(events);
  return <div className="cry-record-groups">{groups.slice(0, limit ?? groups.length).map(group => <div className="cry-record-group" key={group.key}>
    <CryRow event={group.latest} groupSize={group.events.length}/>
    {group.events.length > 1 && <details className="cry-segments">
      <summary>개별 감지 구간 {group.events.length}개 보기</summary>
      <div>{group.events.map(event => <button key={event.id} className="cry-segment-row" onClick={() => go('/children/cries/' + event.id)}>
        <span>{koreaDate(new Date(event.startedAt))} {timeLabel(event.startedAt)}</span><span>{observationLabel(event)}</span>
      </button>)}</div>
    </details>}
  </div>)}</div>;
}
