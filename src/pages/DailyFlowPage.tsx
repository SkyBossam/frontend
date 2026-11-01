import { useState } from 'react';
import { Button, EmptyState, PageHeader, RoutineRow, SectionHeader } from '../components';
import { DailyFlow } from '../components/DailyFlow';
import { useApp } from '../context';
import { today, type Routine, type SleepRecord } from '../domain';
import { SleepForm } from '../components/SleepForm';
import { RoutineForm } from '../components/RoutineForm';

export function DailyFlowPage() {
    const { data, go, commit, busy } = useApp();
    const [date, setDate] = useState(today());
    const [sleep, setSleep] = useState<SleepRecord | null | undefined>();
    const [routine, setRoutine] = useState<Routine | null | undefined>();
    const routines = data.routines.filter(r => r.childId === data.child!.id && r.date === date);
    return <div className="narrow-page">
        <PageHeader title="하루 흐름" subtitle="최근 7일의 돌봄 결과로 예상하는 아이의 하루" onBack={() => go('/children')}/>
        <label className="daily-flow-date">기준 날짜<input type="date" value={date} max={today()} onChange={e => { if (e.target.value && e.target.value <= today()) setDate(e.target.value); }}/></label>
        <div className="daily-record-actions"><Button variant="secondary" disabled={busy} onClick={() => setSleep(null)}>수면 기록 추가</Button><Button variant="secondary" disabled={busy} onClick={() => setRoutine(null)}>루틴 추가</Button></div>
        <DailyFlow expanded selectedDate={date} onSleepSelect={setSleep}/>
        <section className="card routine-management"><SectionHeader title="이날의 루틴"/>{routines.length ? routines.map(r => <RoutineRow key={r.id} routine={r} onEdit={() => setRoutine(r)} onToggle={() => { if (!busy) void commit(d => ({ ...d, routines: d.routines.map(item => item.id === r.id ? { ...item, status: item.status === 'done' ? 'todo' : 'done' } : item) })); }}/>) : <EmptyState title="이날의 루틴이 없어요"/>}</section>
        {sleep !== undefined && <SleepForm initial={sleep || undefined} date={date} onClose={() => setSleep(undefined)}/>}
        {routine !== undefined && <RoutineForm initial={routine || undefined} defaultDate={date} onClose={() => setRoutine(undefined)}/>}
    </div>;
}
