import { CryAnalysis } from '../components/CryAnalysis';
import { cryGuidance, observationLabel } from '../cryPresentation';
import { useState } from 'react';
import { ArrowRight, Bell, Check, Clock3 } from 'lucide-react';
import { Badge, Button, Notice } from '../components';
import { actionLabels, dateLabel, koreaDate, responseLabels, timeLabel, type CryResponse } from '../domain';
import { useCryFlow } from '../flows/CryFlow';

export function CryDetail() {
  const { data, go, busy, event, feedback, draft, setDraft, base, date, toggle, save, savedCard, beginFollowUp } = useCryFlow();
  const [editing, setEditing] = useState(false);
  const stopped = event.alertClosed || feedback?.response === 'stopped';
  const linked = event.alertId ? data.cries.filter(e => e.childId === event.childId && e.alertId === event.alertId).sort((a,b) => a.startedAt.localeCompare(b.startedAt)) : [event];
  return <>
    <div className="event-meta"><span><Clock3 size={16}/>{timeLabel(event.startedAt)}</span><span>{dateLabel(date)}</span></div>
    <CryAnalysis event={event} demo={data.demo}/>
    <section className="card" aria-label="추천 행동">
      <div className="section-heading"><h2>추천 행동</h2><Badge>{event.recommendations?.length ? '분석 기반 안내' : '기본 돌봄 안내'}</Badge></div>
      <p>{event.recommendations?.length ? '감지 당시의 분석 결과를 참고해 주세요.' : '원인을 특정하지 못해도 다음 순서로 아이를 살펴볼 수 있어요.'}</p>
      <ol className="cry-guidance-list">{cryGuidance(event).slice(0, 3).map(action => <li key={action.actionKey}><strong>{action.title}</strong><p>{action.explanation}</p></li>)}</ol>
      <Button variant="secondary" className="full" onClick={() => go(base + '/recommendations')}>추천 행동 자세히 보기 <ArrowRight size={18}/></Button>
    </section>
    <section className="card">
      <div className="section-heading"><h2><Bell size={20}/> 울음 대응 상태</h2><Badge tone={stopped ? 'green' : 'yellow'}>{stopped ? '울음 그침 확인' : feedback ? '대응 중' : '대응 대기'}</Badge></div>
      <p>{stopped ? '이 알림에 대해 보호자가 울음 그침을 기록했어요.' : `울음 기록 ${event.alertOccurrences || linked.length}건을 한 건의 알림으로 묶어 대응을 기다려요.`}</p>
      <p className="muted">모델 관측: {observationLabel(event)}</p>
      <Notice>모델의 구간 종료와 보호자가 확인한 아이의 반응은 별도로 기록해요. 화면을 열거나 닫아도 대응 완료로 처리하지 않아요.</Notice>
    </section>
    {linked.length > 1 && <section className="card"><h2>같은 알림에 연결된 울음</h2><p className="muted">각 발생 구간은 별도의 기록이에요.</p><ul>{linked.map(e => <li key={e.id}><button className="text-button" onClick={() => go('/children/cries/' + e.id)}>{dateLabel(koreaDate(new Date(e.startedAt)))} {timeLabel(e.startedAt)} · {observationLabel(e)}{e.id === event.id ? ' · 현재 기록' : ''}</button></li>)}</ul></section>}
    {savedCard}
    {!editing && <Button className="full" variant="secondary" disabled={busy} onClick={() => { beginFollowUp(); setEditing(true); }}>{feedback ? stopped ? '대응·반응 다시 기록하기' : '추가 돌봄·울음 그침 확인하기' : '실제로 한 행동과 아이 반응 입력하기'} <ArrowRight size={18}/></Button>}
    {editing && <section className="card">
      <div className="flow-intro"><h2>어떻게 돌봐 주었나요?</h2><p>실제로 한 행동과 현재 아이의 반응을 함께 남겨 주세요.</p></div>
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy}><legend>시도한 행동 · 여러 개 선택 가능</legend><div className="choice-list">
          {Object.entries(actionLabels).map(([id, label]) => <label className={'choice ' + (draft.actions.includes(id) ? 'selected' : '')} key={id}><input type="checkbox" checked={draft.actions.includes(id)} onChange={() => toggle(id)}/><span className="choice-check">{draft.actions.includes(id) && <Check size={16}/>}</span><strong>{label}</strong></label>)}
        </div></fieldset>
        {draft.actions.includes('other') && <label className="field">기타 행동<input required maxLength={150} value={draft.other || ''} onChange={event => setDraft(d => ({ ...d, other: event.target.value }))}/></label>}
        <fieldset disabled={busy}><legend>아이의 울음이 그쳤나요?</legend><div className="choice-list responses">
          {(Object.entries(responseLabels) as [CryResponse, string][]).map(([id, label]) => <label className={'choice ' + (draft.response === id ? 'selected' : '')} key={id}><input type="radio" name="cry-response" checked={draft.response === id} onChange={() => setDraft(d => ({ ...d, response: id }))}/><span className="choice-check radio">{draft.response === id && <Check size={16}/>}</span><strong>{label}</strong></label>)}
        </div></fieldset>
        <label className="field">메모 <small>선택</small><textarea maxLength={500} value={draft.note} disabled={busy} onChange={event => setDraft(d => ({ ...d, note: event.target.value }))} placeholder="아이의 반응이나 돌봄 내용을 남겨 주세요"/></label>
        <Button className="full" disabled={busy || !draft.actions.length || !draft.response}>{busy ? '저장 중…' : '대응과 반응 기록하기'} <Check size={18}/></Button>
      </form>
    </section>}

  </>;
}
