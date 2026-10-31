import { useState } from 'react';
import { PageHeader } from '../components';
import { DailyFlow } from '../components/DailyFlow';
import { useApp } from '../context';
import { today } from '../domain';

export function DailyFlowPage() {
    const { go } = useApp();
    const [date, setDate] = useState(today());
    return <div className="narrow-page">
        <PageHeader title="하루 흐름" subtitle="수면과 울음으로 살펴보는 아이의 하루" onBack={() => go('/children')}/>
        <label className="daily-flow-date">기록 날짜<input type="date" value={date} max={today()} onChange={e => { if (e.target.value && e.target.value <= today()) setDate(e.target.value); }}/></label>
        <DailyFlow expanded selectedDate={date}/>
    </div>;
}
