import { ArrowRight, Bell, CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components';
import { cryResult } from '../cryPresentation';
import type { CryEvent } from '../domain';
import type { SkyDevice } from '../skyEye';
import { findObservedCry, type ObservedCry } from '../cryNavigation';

export function HomeObservationBanner({ items, cries, childId, childName, go, refreshRecords }: {
  items: SkyDevice[]; cries: CryEvent[]; childId?: string; childName?: string;
  go: (path: string) => void;
  refreshRecords?: () => Promise<void>;
}) {
  const [requested, setRequested] = useState<ObservedCry | null>(null);
  const [failed, setFailed] = useState(false);
  // useSkyEye has already expired stale audio/video observations.
  const crying = items.filter(item => item.status.audio.available && item.status.audio.cryDetected)
    .sort((a, b) => (b.status.audio.observedAt || '').localeCompare(a.status.audio.observedAt || ''))[0];
  const danger = items.some(item => Object.values(item.safety).some(value => value === 'immediate' || value === 'caution'));
  const observed = items.some(item => item.status.video.available);
  const target = crying && childId && crying.status.audio.observedAt
    ? { childId, deviceId: crying.deviceId, observedAt: crying.status.audio.observedAt, recordId: crying.cryEventId } : null;
  useEffect(() => {
    if (!requested) return;
    if (requested.childId !== childId) { setRequested(null); setFailed(false); return; }
    if (failed) return;
    const refresh = () => { void refreshRecords?.().catch(() => {}); };
    refresh();
    const interval = setInterval(refresh, 2000);
    const timeout = setTimeout(() => setFailed(true), 15000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [requested, childId, failed, refreshRecords]);
  useEffect(() => {
    if (!requested || failed || requested.childId !== childId) return;
    const record = findObservedCry(cries, requested);
    if (record) { setRequested(null); go('/children/cries/' + record.id); }
  }, [cries, requested, childId, failed, go]);
  const openDetail = () => {
    const observation = requested || target;
    if (!observation || observation.childId !== childId) return;
    if (observation.recordId) { setRequested(null); setFailed(false); go('/children/cries/' + encodeURIComponent(observation.recordId)); return; }
    const record = findObservedCry(cries, observation);
    if (record) { setRequested(null); setFailed(false); go('/children/cries/' + record.id); }
    else { setFailed(false); setRequested({ ...observation }); }
  };

  return <div className={'alert-banner ' + (crying || danger ? 'danger' : 'calm')} role="status" aria-live="polite">
    <span className="alert-icon">{crying ? <Bell size={27}/> : <CircleAlert size={27}/>}</span>
    <div>
      {crying && <span className="eyebrow">울음 감지</span>}
      <h3>{crying ? `${childName || '아이'}의 울음소리가 감지됐어요.` : danger ? '기기에서 확인이 필요한 상태를 관측했어요.' : observed ? '기기의 관측 결과가 도착하고 있어요.' : '현재 아이의 상태를 확인할 수 없어요.'}</h3>
      <p>{crying ? `${cryResult({ ...crying.status.audio, observedAt: crying.status.audio.observedAt || '' })} · 아이를 직접 살피고, 울음 상세에서 추천 돌봄을 확인해 주세요.` : '아이를 직접 살피고, 모니터링에서 관측 결과를 확인해 주세요.'}</p>
      {crying && danger && <p>카메라에서도 확인이 필요한 상태를 관측했어요. 관측 결과도 함께 확인해 주세요.</p>}
      {requested && <p>{failed ? '해당 울음 기록을 아직 불러오지 못했어요. 다시 시도해 주세요.' : '감지된 울음 기록을 불러오고 있어요. 준비되면 상세 화면으로 이동해요.'}</p>}
    </div>
    <div className="observation-banner-actions">{(!crying || danger) && <Button variant="yellow" onClick={() => go('/monitor')}>관측 결과 보기</Button>}
    {(crying || requested) && <Button variant="yellow" disabled={!!requested && !failed || !requested && !target} onClick={openDetail}>{requested && !failed ? '기록 확인 중…' : failed ? '울음 상세 다시 보기' : '울음 상세 보기'} <ArrowRight size={16}/></Button>}
    {requested && <Button variant="ghost" onClick={() => { setRequested(null); setFailed(false); }}>취소</Button>}
    </div>
  </div>;
}
