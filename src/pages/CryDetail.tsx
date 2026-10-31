import { CryAnalysis } from '../components/CryAnalysis';
import { cryGuidance } from '../cryPresentation';
import { ArrowRight, Clock3 } from 'lucide-react';
import { Button } from '../components';
import { dateLabel, timeLabel } from '../domain';
import { useCryFlow } from '../flows/CryFlow';

export function CryDetail() {
  const { data, go, busy, event, feedback, base, date, savedCard, beginFollowUp } = useCryFlow();
  const stopped = event.alertClosed || feedback?.response === 'stopped';
  return <>
    <div className="event-meta"><span><Clock3 size={16}/>{timeLabel(event.startedAt)}</span><span>{dateLabel(date)}</span></div>
    <CryAnalysis event={event} demo={data.demo}/>
    <section className="card" aria-label="추천 행동">
      <div className="section-heading"><h2>추천 행동</h2></div>
      <p>{event.recommendations?.length ? '감지 당시의 분석 결과를 참고해 주세요.' : '원인을 특정하지 못해도 다음 순서로 아이를 살펴볼 수 있어요.'}</p>
      <ol className="cry-guidance-list">{cryGuidance(event).slice(0, 3).map(action => <li key={action.actionKey}><strong>{action.title}</strong><p>{action.explanation}</p></li>)}</ol>
      <Button variant="secondary" className="full" onClick={() => go(base + '/recommendations')}>추천 행동 자세히 보기 <ArrowRight size={18}/></Button>
    </section>
    {savedCard}
    <Button className="full care-response-cta" variant="primary" disabled={busy} onClick={() => { beginFollowUp(); go(base + '/actions'); }}>{feedback ? stopped ? '대응·반응 다시 기록하기' : '추가 돌봄·울음 그침 확인하기' : '실제로 한 행동과 아이 반응 입력하기'} <ArrowRight size={18}/></Button>

  </>;
}
