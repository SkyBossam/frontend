export type Severity = 'immediate' | 'caution' | 'stable' | 'unknown';
export type DetectionStatus = 'new' | 'acknowledged' | 'checking' | 'resolved' | 'unverifiable';
export type CryResponse = 'stopped' | 'reduced' | 'continues' | 'unknown';
export type RoutineType = 'sleep' | 'wake' | 'play' | 'soothe' | 'custom';
export interface Child {
    id: string;
    name: string;
    birthDate: string;
    gender?: string;
    photoUrl?: string;
}
export interface Routine {
    id: string;
    version?: number;
    childId: string;
    title: string;
    type: RoutineType;
    date: string;
    time: string;
    endTime?: string;
    endDate?: string;
    note?: string;
    status: 'todo' | 'in_progress' | 'done';
}
export interface CryEvent {
    id: string;
    childId: string;
    startedAt: string;
    durationSec?: number;
    cause: string;
    analysisAvailable: boolean;
}
export interface Feedback {
    eventId: string;
    childId: string;
    actions: string[];
    note: string;
    response: CryResponse;
    createdAt: string;
}
export interface Draft {
    actions: string[];
    note: string;
    response?: CryResponse;
    other?: string;
}
export const sleepRisks = {
    posture: { label: '아기 자세', message: '아기 자세 확인이 필요해요', instruction: '아이의 자세와 호흡을 직접 확인해 주세요.' },
    face: { label: '얼굴 노출', message: '얼굴 가림 의심 신호가 감지됐어요', instruction: '아이의 얼굴 주변을 직접 확인해 주세요.' },
    objects: { label: '주변 물체', message: '주변 물체 위험이 의심돼요', instruction: '아이 주변의 물건을 직접 확인해 주세요.' },
    edge: { label: '가장자리 접근', message: '가장자리 접근이 감지됐어요', instruction: '아이의 위치와 가장자리를 직접 확인해 주세요.' },
};
export type SleepRisk = keyof typeof sleepRisks;
export function getSleepRisk(alert: AlertEvent) { return sleepRisks[alert.kind || 'face'] || sleepRisks.face; }
export interface AlertEvent {
    kind?: SleepRisk;
    id: string;
    childId: string;
    severity: Severity;
    status: DetectionStatus;
    startedAt: string;
    result?: string;
}
export interface SleepRecord {
    id: string;
    version?: number;
    childId: string;
    startedAt: string;
    endedAt: string;
}
export interface AppData {
    child: Child | null;
    routines: Routine[];
    cries: CryEvent[];
    sleepRecords: SleepRecord[];
    feedback: Feedback[];
    drafts: Record<string, Draft>;
    alert: AlertEvent | null;
    preferences: {
        crySound: boolean;
        push: boolean;
    };
    demo: boolean;
    onboardingComplete: boolean;
}
export const responseLabels: Record<CryResponse, string> = { stopped: '울음을 그쳤어요', reduced: '울음이 줄었어요', continues: '계속 울어요', unknown: '모르겠어요' };
export const actionLabels: Record<string, string> = { sleep: '수면 환경 조정하기', hug: '안아주고 달래기', noise: '백색소음 들려주기', posture: '자세·상태 확인하기', diaper: '기저귀 상태 확인하기', other: '기타', none: '시도하지 않음' };
export const koreaDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const today = () => koreaDate();
export const timeLabel = (iso: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
export const dateLabel = (date: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(date + 'T12:00:00+09:00'));
export function ageLabel(birth: string, date = today()) {
    const [by, bm, bd] = birth.split('-').map(Number);
    const [y, m, d] = date.split('-').map(Number);
    let months = (y - by) * 12 + m - bm;
    let days = d - bd;
    if (days < 0) {
        months--;
        days += new Date(y, m - 1, 0).getDate();
    }
    return `${Math.max(0, months)}개월 ${Math.max(0, days)}일`;
}
export function validBirthDate(value: string, date = today()) { const parsed = new Date(value + 'T12:00:00+09:00'); return /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= date && value >= '2000-01-01' && !Number.isNaN(parsed.getTime()) && koreaDate(parsed) === value; }
export function sleepMinutes(records: SleepRecord[], childId: string, date: string): number { const from = new Date(date + 'T00:00:00+09:00').getTime(); const to = from + 86400000; const ranges = records.filter(r => r.childId === childId).map(r => [Math.max(from, new Date(r.startedAt).getTime()), Math.min(to, new Date(r.endedAt).getTime())]).filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]); let total = 0, end = from; for (const [s, e] of ranges) {
    total += Math.max(0, e - Math.max(s, end));
    end = Math.max(end, e);
} return Math.round(total / 60000); }
export function durationLabel(minutes: number): string { return minutes ? `${Math.floor(minutes / 60) ? Math.floor(minutes / 60) + '시간 ' : ''}${minutes % 60 ? minutes % 60 + '분' : ''}`.trim() : '기록 없음'; }
export function filterEvents(events: CryEvent[], childId: string, filter: string, date = today()) {
    const start = new Date(date + 'T00:00:00+09:00').getTime() - 6 * 86400000;
    const end = new Date(date + 'T23:59:59+09:00').getTime();
    return events.filter(e => e.childId === childId && (filter === 'all' || (filter === 'today' ? koreaDate(new Date(e.startedAt)) === date : new Date(e.startedAt).getTime() >= start && new Date(e.startedAt).getTime() <= end))).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
export function saveFeedback(data: AppData, feedback: Feedback): AppData {
    if (!data.child || feedback.childId !== data.child.id || !data.cries.some(e => e.id === feedback.eventId && e.childId === feedback.childId))
        throw new Error('해당 아이의 울음 기록을 찾을 수 없어요.');
    if (data.feedback.some(f => f.eventId === feedback.eventId && f.childId === feedback.childId))
        return data;
    if (!feedback.actions.length || !responseLabels[feedback.response])
        throw new Error('시도 행동과 아이 반응을 선택해 주세요.');
    if (feedback.actions.includes('none') && feedback.actions.length > 1)
        throw new Error('시도하지 않음과 다른 행동을 함께 선택할 수 없어요.');
    const drafts = { ...data.drafts };
    delete drafts[feedback.eventId];
    return { ...data, feedback: [...data.feedback, feedback], drafts };
}
export function updateAlert(alert: AlertEvent, action: 'open' | 'check' | 'close' | 'submit', result?: string): AlertEvent {
    if (alert.status === 'resolved' || action === 'close')
        return alert;
    if (action === 'open')
        return { ...alert, status: alert.status === 'new' ? 'acknowledged' : alert.status };
    if (action === 'check')
        return { ...alert, status: 'checking' };
    if (!result)
        throw new Error('현장 확인 결과를 선택해 주세요.');
    return { ...alert, status: result === 'removed' || result === 'false_alarm' ? 'resolved' : result === 'unverifiable' ? 'unverifiable' : 'checking', result };
}
export const emptyData = (): AppData => ({ child: null, routines: [], cries: [], sleepRecords: [], feedback: [], drafts: {}, alert: null, preferences: { crySound: true, push: false }, demo: false, onboardingComplete: false });
export function demoData(): AppData {
    const date = today();
    const old = new Date(date + 'T12:00:00+09:00');
    old.setDate(old.getDate() - 1);
    const birth = new Date(date + 'T12:00:00+09:00');
    birth.setMonth(birth.getMonth() - 6);
    birth.setDate(birth.getDate() - 12);
    return { ...emptyData(), demo: true, onboardingComplete: true, child: { id: 'child-demo', name: '지안이', birthDate: koreaDate(birth), photoUrl: '/baby-demo.png' },
        sleepRecords: [{ id: 's1', childId: 'child-demo', startedAt: date + 'T00:00:00+09:00', endedAt: date + 'T06:00:00+09:00' }, { id: 's2', childId: 'child-demo', startedAt: date + 'T07:00:00+09:00', endedAt: date + 'T09:00:00+09:00' }, { id: 's3', childId: 'child-demo', startedAt: date + 'T12:00:00+09:00', endedAt: date + 'T13:20:00+09:00' }],
        routines: [{ id: 'r1', childId: 'child-demo', title: '포근한 밤잠', type: 'sleep', date, time: '20:30', endTime: '06:00', status: 'todo' }, { id: 'r2', childId: 'child-demo', title: '즐거운 놀이 시간', type: 'play', date, time: '10:00', endTime: '10:30', status: 'done' }, { id: 'r3', childId: 'child-demo', title: '안아주고 달래기', type: 'soothe', date, time: '15:00', endTime: '15:20', status: 'in_progress' }],
        cries: [{ id: 'cry-1', childId: 'child-demo', startedAt: date + 'T14:32:00+09:00', durationSec: 720, cause: '배고픔 가능성', analysisAvailable: true }, { id: 'cry-2', childId: 'child-demo', startedAt: date + 'T11:20:00+09:00', durationSec: 480, cause: '졸림 가능성', analysisAvailable: true }, { id: 'cry-3', childId: 'child-demo', startedAt: date + 'T09:15:00+09:00', durationSec: 300, cause: '불편함 가능성', analysisAvailable: true }, { id: 'cry-4', childId: 'child-demo', startedAt: koreaDate(old) + 'T21:40:00+09:00', durationSec: 900, cause: '원인 확인 필요', analysisAvailable: false }],
        feedback: [{ eventId: 'cry-2', childId: 'child-demo', actions: ['sleep', 'hug'], note: '조명을 낮추고 조용히 안아주었어요.', response: 'stopped', createdAt: date + 'T11:29:00+09:00' }, { eventId: 'cry-3', childId: 'child-demo', actions: ['diaper'], note: '', response: 'reduced', createdAt: date + 'T09:22:00+09:00' }] };
}
