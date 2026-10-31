import { useEffect, useState } from 'react';
import { Check, Heart, Moon, ShieldCheck, Sparkles, Volume2 } from 'lucide-react';
import { Badge, Button, EmptyState, PageHeader, Steps } from '../components';
import { useApp } from '../context';
import { actionLabels, koreaDate, responseLabels, saveFeedback, timeLabel, type Draft } from '../domain';
import { createContext, useContext, type ComponentType } from 'react';
const actions = [{ id: 'sleep', icon: Moon, description: '주변 자극을 줄이고 편안한 환경을 만들어 주세요.', steps: ['조명을 낮추고 주변 소음을 줄여 주세요.', '아이의 얼굴과 호흡을 직접 살펴 주세요.', '수면 공간에 불필요한 물건이 없는지 확인해 주세요.'] }, { id: 'hug', icon: Heart, description: '아이를 부드럽게 안고 반응을 살펴 주세요.', steps: ['머리와 목을 편안히 받쳐 주세요.', '작은 목소리로 말을 걸며 천천히 달래 주세요.', '아이의 표정과 호흡의 변화를 살펴 주세요.'] }, { id: 'noise', icon: Volume2, description: '익숙하고 잔잔한 소리를 작게 들려주세요.', steps: ['소리 기기를 아이와 충분히 떨어뜨려 두세요.', '작은 음량으로 시작해 반응을 확인해 주세요.'] }, { id: 'posture', icon: ShieldCheck, description: '아이의 자세와 주변 상태를 직접 확인해 주세요.', steps: ['아이 얼굴이 가려져 있지 않은지 살펴 주세요.', '평소와 다른 불편한 모습이 있는지 확인해 주세요.'] }, { id: 'diaper', icon: Sparkles, description: '젖거나 불편한 부분이 없는지 살펴 주세요.', steps: ['기저귀 상태를 직접 확인해 주세요.', '옷이 조이거나 불편한 부분이 있는지 살펴 주세요.'] }];
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
    const [selected, setSelected] = useState(draft.actions.find(a => actions.some(x => x.id === a)) || 'sleep');
    if (!event)
        return null;
    const base = '/children/cries/' + eventId;
    const title = stage === 'recommendations' ? '맞춤 행동 관리' : stage === 'actions' ? '시도 행동 기록' : stage === 'response' ? '아이 반응 선택' : stage === 'complete' ? '기록 완료' : '울음 상세';
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
    const save = async () => { if (!draft.response || !draft.actions.length || busy)
        return; const actionsToSave = draft.actions.map(id => id === 'other' ? 'other:' + draft.other : id); if (await commit(d => saveFeedback(d, { eventId, childId: data.child!.id, actions: actionsToSave, note: draft.note, response: draft.response!, createdAt: new Date().toISOString() }))) {
        sessionStorage.removeItem(key);
        go(base + '/complete');
    } };
    const savedCard = feedback && <div className="saved-feedback"><div><Check size={17}/><strong>이전 대응 결과</strong><span>{timeLabel(feedback.createdAt)} 기록</span></div><dl><dt>시도한 행동</dt><dd>{feedback.actions.map(id => id.startsWith('other:') ? id.slice(6) : actionLabels[id] || id).join(', ')}</dd><dt>아이의 반응</dt><dd>{responseLabels[feedback.response]}</dd>{feedback.note && <><dt>메모</dt><dd>{feedback.note}</dd></>}</dl></div>;
    return { data, go, busy, event, feedback, draft, setDraft, selected, setSelected, stage, base, title, back, date, proceed, toggle, save, savedCard, actions };
}
type CryFlowState = NonNullable<ReturnType<typeof useCryFlowState>>;
const CryFlowContext = createContext<CryFlowState | null>(null);
export function useCryFlow() { const value = useContext(CryFlowContext); if (!value)
    throw new Error('Cry flow page requires its flow provider.'); return value; }
export function CryFlow({ Page }: {
    Page?: ComponentType;
}) {
    const state = useCryFlowState();
    const { go } = useApp();
    if (!state)
        return <div className="narrow-page"><PageHeader title="울음 기록" onBack={() => go('/children/cries')}/><EmptyState title="기록을 찾을 수 없어요" description="아이의 울음 목록에서 기록을 다시 선택해 주세요." action={<Button onClick={() => go('/children/cries')}>울음 목록으로</Button>}/></div>;
    const { title, back, stage, event } = state;
    return <CryFlowContext.Provider value={state}><div className="narrow-page flow-page"><PageHeader title={title} onBack={back} action={stage !== 'complete' ? <Badge>{timeLabel(event.startedAt)} 감지</Badge> : undefined}/>{['recommendations', 'actions', 'response'].includes(stage) && <Steps current={stage === 'recommendations' ? 0 : stage === 'actions' ? 1 : 2} labels={['추천 확인', '시도 행동', '아이 반응']}/>}{Page ? <Page /> : <EmptyState title="준비 중인 화면이에요"/>}</div></CryFlowContext.Provider>;
}
