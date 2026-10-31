import { Sparkles } from 'lucide-react';
import { Badge } from '../components';
import type { CryEvent } from '../domain';
import { cryResult } from '../cryPresentation';

export function CryAnalysis({ event, demo = false }: { event: CryEvent; demo?: boolean }) {
  const audio = event.audioAnalysis;
  return <section className="card analysis-card" aria-label="울음 분석 결과">
    <div className="section-heading"><h2><Sparkles size={20}/> 울음 분석 결과</h2><Badge tone="yellow">{demo ? '시연 결과' : '감지 결과'}</Badge></div>
    <h3>{demo && event.analysisAvailable ? event.cause : cryResult(audio)}</h3>
    {event.causes?.length ? <ul>{event.causes.map(c => <li key={c.causeKey}><strong>{c.label}</strong> · {c.reason}</li>)}</ul> : <p>원인 미분류 · 현재 모델은 울음 여부를 감지해요. 배고픔 등 구체적인 원인은 아이의 상태를 직접 확인해 주세요.</p>}
    {audio && <p className="muted small-text">감지 당시 모델 점수 · 아기 울음 {audio.babyCryScore?.toFixed(2) ?? '—'} / 울음 {audio.cryingScore?.toFixed(2) ?? '—'}<br/>원인의 확률을 뜻하지 않아요.</p>}
  </section>;
}
