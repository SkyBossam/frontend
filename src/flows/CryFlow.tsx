import { cryGuidance } from '../cryPresentation';
import { useEffect, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Badge, Button, EmptyState, PageHeader, Steps } from '../components';
import { useApp } from '../context';
import { actionLabels, koreaDate, responseLabels, saveFeedback, timeLabel, type Draft } from '../domain';
import { createContext, useContext, type ComponentType } from 'react';
function useDraft(eventId: string) { const { data, account, toast } = useApp(); const key = `aicoo-draft:${account}:${data.child?.id}:${eventId}`; const [draft, setDraft] = useState<Draft>(() => { try {
    const cached = sessionStorage.getItem(key);
    if (cached)
        return JSON.parse(cached);
}
catch { } return data.drafts[eventId] || { actions: [], note: '' }; }); useEffect(() => { try {
    sessionStorage.setItem(key, JSON.stringify(draft));
}
catch {
    toast('임시 입력을 저장하지 못했어요. 이 화면을 유지해 주세요.');
} }, [draft, key]); return { draft, setDraft, key }; }
function useCryFlowState() {
    const { data, path, go, commit, busy, toast } = useApp();
    const segments = path.split('/');
    const eventId = segments[3];
    const stage = segments[4] || 'detail';
    const event = data.cries.find(e => e.id === eventId && e.childId === data.child?.id);
    const feedback = data.feedback.find(f => f.eventId === eventId && f.childId === data.child?.id);
    const { draft, setDraft, key } = useDraft(eventId);
    const [selected, setSelected] = useState('');
    if (!event)
        return null;
    const actions = cryGuidance(event).map(a => ({ id: a.actionKey, title: a.title, description: a.explanation, steps: a.instructions, icon: ShieldCheck }));
    const base = '/children/cries/' + eventId;
    const title = stage === 'recommendations' ? '추천 행동' : stage === 'actions' ? '시도 행동 기록' : stage === 'response' ? '아이 반응 선택' : stage === 'complete' ? '기록 완료' : '울음 상세';
    const back = () => go(stage === 'detail' ? '/children/cries' : stage === 'recommendations' ? base : stage === 'actions' ? base + '/recommendations' : stage === 'response' ? base + '/actions' : '/children');
    const date = koreaDate(new Date(event.startedAt));
    const proceed = async () => { if (!draft.actions.length) {
        toast('시도한 행동 또는 시도하지 않음을 선택해 주세요.');
        return;
    } if (draft.actions.includes('other') && !draft.other?.trim()) {
        toast('기타 행동을 입력해 주세요.');
        return;
    } if (await commit(d => ({ ...d, drafts: { ...d.drafts, [eventId]: draft } })))
        go(base + '/response'); };
    const toggle = (id: string) => setDraft(d => ({ ...d, actions: id === 'none' ? ['none'] : d.actions.includes(id) ? d.actions.filter(a => a !== id) : [...d.actions.filter(a => a !== 'none'), id] }));
    const save = async () => { if (draft.actions.includes('other') && !draft.other?.trim()) { toast('기타 행동을 입력해 주세요.'); return; } if (!draft.response || !draft.actions.length || busy)
        return; const actionsToSave = draft.actions.map(id => id === 'other' ? 'other:' + draft.other : id); if (await commit(d => saveFeedback(d, { eventId, version: draft.version, childId: data.child!.id, actions: actionsToSave, note: draft.note, response: draft.response!, createdAt: new Date().toISOString() }))) {
        sessionStorage.removeItem(key);
        go(base + '/complete');
    } };
    const beginFollowUp = () => {
        setDraft({ version: feedback?.version ?? (feedback ? 1 : undefined), actions: [], note: '' });
    };
    const savedCard = feedback && <div className="saved-feedback"><div><Check size={17}/><strong>{feedback.response === 'stopped' ? '울음 그침 확인' : '대응 중 · 반응 확인 대기'}</strong></div>{[...(feedback.history || []), { ...feedback, createdAt: feedback.updatedAt || feedback.createdAt }].map((record, index) => <dl key={index}><dt>기록 시각</dt><dd>{koreaDate(new Date(record.createdAt))} {timeLabel(record.createdAt)}</dd><dt>시도한 행동</dt><dd>{record.actions.map(id => id.startsWith('other:') ? id.slice(6) : actionLabels[id] || id).join(', ')}</dd><dt>아이의 반응</dt><dd>{responseLabels[record.response]}</dd>{record.note && <><dt>메모</dt><dd>{record.note}</dd></>}</dl>)}</div>;
    return { data, go, busy, event, feedback, draft, setDraft, selected: selected || actions[0].id, setSelected, stage, base, title, back, date, proceed, toggle, save, savedCard, actions, beginFollowUp };
}
type CryFlowState = NonNullable<ReturnType<typeof useCryFlowState>>;
const CryFlowContext = createContext<CryFlowState | null>(null);
export function useCryFlow() { const value = useContext(CryFlowContext); if (!value)
    throw new Error('Cry flow page requires its flow provider.'); return value; }
export function CryFlow({ Page }: {
    Page?: ComponentType;
}) {
    const state = useCryFlowState();
    const { go, recordsLoading } = useApp();
    if (!state)
        return <div className="narrow-page"><PageHeader title="울음 기록" onBack={() => go('/children/cries')}/><EmptyState title={recordsLoading ? '기록을 불러오고 있어요' : '기록을 찾을 수 없어요'} description="아이의 울음 목록에서 기록을 다시 선택해 주세요." action={<Button onClick={() => go('/children/cries')}>울음 목록으로</Button>}/></div>;
    const { title, back, stage, event } = state;
    return <CryFlowContext.Provider value={state}><div className="narrow-page flow-page"><PageHeader title={title} onBack={back} action={stage !== 'complete' ? <Badge>{timeLabel(event.startedAt)} 감지</Badge> : undefined}/>{['recommendations', 'actions', 'response'].includes(stage) && <Steps current={stage === 'recommendations' ? 0 : stage === 'actions' ? 1 : 2} labels={['추천 확인', '시도 행동', '아이 반응']}/>}{Page ? <Page /> : <EmptyState title="준비 중인 화면이에요"/>}</div></CryFlowContext.Provider>;
}
