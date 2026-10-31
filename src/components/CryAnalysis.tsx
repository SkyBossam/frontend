import { ArrowRight, Bell, Sparkles } from 'lucide-react';
import { Badge, Button } from '../components';
import { useApp } from '../context';
import type { CryEvent } from '../domain';
import { cryGuidance, cryResult } from '../cryPresentation';

export function CryAnalysis({ event, demo = false }: { event: CryEvent; demo?: boolean }) {
  const audio = event.audioAnalysis;
  return <section className="card analysis-card" aria-label="울음 분석 결과">
    <div className="section-heading"><h2><Sparkles size={20}/> 울음 분석 결과</h2><Badge tone="yellow">{demo ? '시연 결과' : '감지 결과'}</Badge></div>
    <h3>{demo && event.analysisAvailable ? event.cause : cryResult(audio)}</h3>
    {event.causes?.length ? <ul>{event.causes.map(c => <li key={c.causeKey}><strong>{c.label}</strong> · {c.reason}</li>)}</ul> : <p>원인 미분류 · 현재 모델은 울음 여부를 감지해요. 배고픔 등 구체적인 원인은 아이의 상태를 직접 확인해 주세요.</p>}
    {audio && <p className="muted small-text">감지 당시 모델 점수 · 아기 울음 {audio.babyCryScore?.toFixed(2) ?? '—'} / 울음 {audio.cryingScore?.toFixed(2) ?? '—'}<br/>원인의 확률을 뜻하지 않아요.</p>}
  </section>;
}

export function HomeCryStatus() {
  const { data, sky, go } = useApp();
  const devices = sky.snapshot?.items.filter(d => d.status.audio.available && d.status.audio.cryDetected) || [];
  if (!devices.length) return <div className="home-cry-result"><strong><Bell size={17}/> 울음 관측</strong><p>{sky.snapshot?.items.some(d => d.status.audio.available) ? '현재 울음 신호가 없어요.' : '마이크 관측을 확인할 수 없어요.'}</p></div>;
  return <>{devices.map(device => {
    const audio = device.status.audio;
    const event = data.cries.filter(e => e.childId === data.child?.id && e.sourceId === device.deviceId && !e.endedAt && e.durationSec === undefined).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    return <div className="home-cry-result" key={device.deviceId}>
      <div className="section-heading"><h3><Bell size={18}/> {cryResult({ ...audio, observedAt: audio.observedAt || '' })}</h3><Badge tone="yellow">울음 관측 중</Badge></div>
      <p>{event?.analysisAvailable ? event.cause : '원인 미분류 · 아이의 상태를 직접 확인해 주세요.'}</p>
      <p className="muted">먼저 {event ? cryGuidance(event)[0].title : '아이의 자세·상태 확인하기'}</p>
      <Button variant="secondary" className="full" onClick={() => go(event ? '/children/cries/' + event.id : '/children/cries')}>{event ? '분석 결과와 추천 행동 보기' : '울음 기록 확인하기'} <ArrowRight size={16}/></Button>
    </div>;
  })}</>;
}
