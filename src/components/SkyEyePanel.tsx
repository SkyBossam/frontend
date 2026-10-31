import { useState } from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { Badge, Button, EmptyState, Notice, SectionHeader } from '../components';
import { useApp } from '../context';
import { careLabels, connectionLabel, eventLabel, safetyItems, safetyLabels, safetyTones, type CareAction, type ModelEpisode, type SkyDevice } from '../skyEye';

const date = (value: string) => new Date(value).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function SkyEyeSafety() {
  const { sky } = useApp();
  const items = sky.snapshot?.items || [];
  return <>{(items.length ? items : [null]).map((device, index) => <div key={device?.deviceId || index}>
    {device && <p className="section-description">{device.name} · {device.status.video.available ? '영상 분석 수신 중' : '영상 분석 확인 불가'}</p>}
    <div className="safety-list">{safetyItems.map(({ key, label }) => {
      const state = device?.safety[key] || 'unknown';
      return <div key={key} className={key === 'posture' && (state === 'immediate' || state === 'caution') ? 'posture-risk-highlight' : undefined}><span><ShieldCheck size={17}/>{label}</span><Badge tone={safetyTones[state]}>{safetyLabels[state]}</Badge></div>;
    })}</div>
    {device && !device.status.video.geometryValid && <p className="card-footnote">침대 영역 보정 전에는 가장자리 상태를 판단하지 않아요.</p>}
  </div>)}{sky.error && <p className="model-error" role="status">{sky.error}</p>}</>;
}

function Feedback({ device, episode }: { device: SkyDevice; episode: ModelEpisode }) {
  const { api, workspaceId, data, toast } = useApp();
  const [action, setAction] = useState<CareAction | ''>('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const command = device.commands.find(c => c.episodeUid === episode.episodeUid);
  const recorded = episode.action || (command?.status === 'applied' ? command.action : null);
  const state = recorded ? 'applied' : command?.status || (submitted ? 'queued' : '');
  const submit = async () => {
    if (!action || sending || !data.child) return;
    setSending(true);
    try {
      const result = await api.modelFeedback(workspaceId, data.child.id, device.deviceId, episode.episodeUid, action);
      setSubmitted(result.status === 'queued' || result.status === 'applied');
      toast(result.status === 'applied' ? '파이에 기록이 반영됐어요.' : result.status === 'queued' ? '파이에 전달 중이에요. 처리 결과를 확인해 주세요.' : '전달이 완료되지 않았어요. 기기 연결을 확인해 주세요.');
    } catch (error) { toast(error instanceof Error ? error.message : '기록을 보내지 못했어요.'); }
    finally { setSending(false); }
  };
  return <div className="model-feedback"><strong>{date(episode.endedAt)} 종료한 울음</strong>
    {state ? <p role="status">{state === 'applied' ? `파이 반영 완료 · ${recorded ? careLabels[recorded] : ''}` : state === 'queued' ? '파이에 전달 중 · 아직 학습에 반영되지 않았어요' : state === 'expired' ? '전달 시간 만료 · 기기 연결을 확인해 주세요' : '파이 처리 실패 · 기기에서 기록을 확인해 주세요'}</p> : <>
      <label>실제로 어떤 돌봄을 했나요?<select value={action} onChange={e => setAction(e.target.value as CareAction | '')} disabled={sending}><option value="">행동 선택</option>{Object.entries(careLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <Button variant="secondary" onClick={submit} disabled={!action || sending}>{sending ? '전송 중…' : '실제 행동 기록하기'}</Button>
    </>}
  </div>;
}

function ModelDetails({ device }: { device: SkyDevice }) {
  const { video, audio, personalization: p } = device.status;
  const episodes = new Map<string, ModelEpisode>();
  p?.recentEpisodes.forEach(ep => episodes.set(ep.episodeUid, ep));
  device.events.forEach(({ event }) => {
    if (event.kind === 'cry_episode_ended' && event.endReason === 'quiet' && event.episodeUid && !episodes.has(event.episodeUid)) episodes.set(event.episodeUid, { episodeUid: event.episodeUid, startedAt: event.observedAt, endedAt: event.observedAt, action: null });
  });
  const stateLabels: Record<string, string> = { insufficient_history: '보호자 기록을 모으고 있어요', collecting_audio: '현재 울음을 더 듣고 있어요', idle: '다음 울음을 기다리고 있어요', low_confidence: '이번에는 추천을 판단하기 어려워요', ready: '현재 돌봄 힌트' };
  const posture = ({ supine: '바로 누움', side: '옆으로 누움', prone: '엎드림' } as Record<string, string>)[video.posture || ''] || '자세 미확인';
  const airway = ({ airway_visible: '코·입 보임', airway_covered: '코·입 가림 의심' } as Record<string, string>)[video.airway || ''] || '얼굴 미확인';
  return <section className="card model-card"><SectionHeader title={device.name} icon={<Activity size={19}/>}/>
    <div className="model-status-row"><Badge tone={device.connected ? 'green' : 'gray'}>{connectionLabel(device)}</Badge><span>{device.lastReportAt === null ? '아직 수신한 분석 데이터가 없어요' : `최근 전송 ${date(device.lastReportAt || device.status.observedAt)}`}</span></div>
    <div className="model-observations"><div><strong>자세·얼굴 관측</strong><p>{video.available ? `${posture} · ${airway}` : '현재 입력을 확인할 수 없어요'}</p><small>모델 관측이며, 안전 여부는 아이를 직접 확인해 주세요.</small></div>
      <div><strong>울음 관측</strong><p>{audio.available ? audio.cryDetected ? '울음 후보가 감지됐어요' : '현재 울음 후보 없음' : '마이크 입력 확인 불가'}</p>{audio.available && audio.babyCryScore !== null && <small>아기 울음 모델 점수 {audio.babyCryScore.toFixed(2)} · 확률이나 정확도가 아니에요</small>}</div></div>
    <div className="model-personalization"><h3>{p ? stateLabels[p.state] || '돌봄 힌트 준비 중' : '돌봄 힌트 확인 불가'}</h3>{p ? <><p>보호자 기록 {p.nFeedback}/{p.requiredFeedback}건 · 현재 울음 {p.cryWindows}/{p.requiredCryWindows}창</p>
      {p.recommendations.length > 0 ? <ol className="model-hints">{p.recommendations.map(hint => <li key={hint.action}><strong>{careLabels[hint.action]}</strong><span>상대 가중치 {hint.score.toFixed(2)}</span></li>)}</ol> : <p className="muted">추천을 표시할 조건이 아직 충족되지 않았어요.</p>}
      <small>실험적 돌봄 힌트예요. 울음 원인의 확률이나 진단이 아닙니다. {p.soundOn ? '소리 특징과 이력을 함께 참고해요.' : '현재는 맥락과 이력만 참고해요.'}</small></> : <p className="muted">새로운 마이크 분석이 도착하면 다시 확인해요.</p>}</div>
    {episodes.size > 0 && <div className="model-feedback-list"><h3>실제로 한 돌봄 알려주기</h3><p className="muted">정상 종료된 울음만 기록해요. ‘모르겠어요’와 ‘스스로 진정’은 추천 학습 건수에 포함되지 않아요.</p>{[...episodes.values()].slice(0, 5).map(ep => <Feedback key={ep.episodeUid} device={device} episode={ep}/>)}</div>}
    <details className="model-history"><summary>기기 관측 기록 · 최근 {device.events.length}건</summary><p className="card-footnote">모델의 구간 종료는 보호자가 확인한 위험 해소를 뜻하지 않아요. 과거 기록은 새 알림으로 발송하지 않아요.</p>
      {device.events.length ? <ul>{device.events.map(({ event, recent }) => <li key={event.id}><span>{eventLabel(event)}</span><small>{date(event.observedAt)}{recent ? ' · 방금 수신' : ' · 기록'}</small></li>)}</ul> : <p>아직 수신한 이벤트가 없어요.</p>}</details>
  </section>;
}

export function SkyEyePanel() {
  const { sky, data, go } = useApp();
  if (data.demo) return null;
  return <div className="model-panels">{sky.loading && <Notice>아이쿠 기기의 관측 결과를 확인하고 있어요.</Notice>}{sky.error && <Notice>{sky.error}</Notice>}
    {!sky.loading && !sky.error && !sky.snapshot?.items.length && <section className="card"><EmptyState title="아직 도착한 기기 분석이 없어요" description="아이쿠를 연결하고 파이의 전송 프로그램을 실행하면 여기에 관측 결과가 표시돼요." action={<Button onClick={() => go('/devices')}>아이쿠 연결하기</Button>}/></section>}
    {sky.snapshot?.items.map(device => <ModelDetails key={device.deviceId} device={device}/>)}</div>;
}
