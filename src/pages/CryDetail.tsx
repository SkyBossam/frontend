import { useState } from 'react';
import { ArrowRight, Bell, Check, Clock3, Sparkles } from 'lucide-react';
import { Badge, Button, Notice } from '../components';
import { actionLabels, dateLabel, responseLabels, timeLabel, type CryResponse } from '../domain';
import { useCryFlow } from '../flows/CryFlow';

export function CryDetail() {
  const { data, go, busy, event, feedback, draft, setDraft, base, date, toggle, save, savedCard, beginFollowUp } = useCryFlow();
  const [editing, setEditing] = useState(false);
  const stopped = feedback?.response === 'stopped';
  return <>
    <div className="event-meta"><span><Clock3 size={16}/>{timeLabel(event.startedAt)}</span><span>{dateLabel(date)}</span></div>
    <section className="card">
      <div className="section-heading"><h2><Bell size={20}/> 울음 대응 상태</h2><Badge tone={stopped ? 'green' : 'yellow'}>{stopped ? '울음 그침 확인' : feedback ? '대응 중' : '대응 대기'}</Badge></div>
      <p>{stopped ? '보호자가 아이의 울음이 그쳤다고 기록했어요.' : '이 울음은 한 건의 알림으로 유지하며 보호자의 대응을 기다려요.'}</p>
      <p className="muted">모델 관측: {event.durationSec === undefined ? '울음 구간 종료 미확인' : `첫 감지부터 마지막 종료 관측까지 ${Math.floor(event.durationSec / 60)}분 ${event.durationSec % 60}초`}</p>
      <Notice>모델의 구간 종료와 보호자가 확인한 아이의 반응은 별도로 기록해요. 화면을 열거나 닫아도 대응 완료로 처리하지 않아요.</Notice>
    </section>
    {savedCard}
    {feedback && !editing && <Button className="full" variant="secondary" disabled={busy} onClick={() => { beginFollowUp(); setEditing(true); }}>{stopped ? '대응·반응 다시 기록하기' : '추가 돌봄·울음 그침 확인하기'} <ArrowRight size={18}/></Button>}
    {(!feedback || editing) && <section className="card">
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
    <section className="card analysis-card"><div className="section-heading"><h2><Sparkles size={20}/> 울음 원인 참고</h2><Badge tone="yellow">{data.demo ? '추정 · 시연' : '원인 미확인'}</Badge></div><p>{event.analysisAvailable ? event.cause : '울음 원인은 직접 확인이 필요해요. 아이의 상태와 주변 환경을 살펴 주세요.'}</p><Button variant="secondary" className="full" onClick={() => go(base + '/recommendations')}>추천 행동 확인하기 <ArrowRight size={18}/></Button></section>
  </>;
}
