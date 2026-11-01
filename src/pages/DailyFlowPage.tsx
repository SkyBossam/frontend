import { useState } from 'react';
import { Button, PageHeader } from '../components';
import { DailyFlow } from '../components/DailyFlow';
import { useApp } from '../context';
import { today, type SleepRecord } from '../domain';
import { SleepForm } from '../components/SleepForm';

export function DailyFlowPage() {
    const { go, busy } = useApp();
    const [sleep, setSleep] = useState<SleepRecord | null | undefined>();
    return <div className="narrow-page">
        <PageHeader title="하루 흐름" subtitle="최근 7일의 돌봄 결과로 예상하는 아이의 하루" onBack={() => go('/children')}/>
        <div className="daily-record-actions"><Button variant="secondary" disabled={busy} onClick={() => setSleep(null)}>수면 기록 추가</Button></div>
        <DailyFlow expanded onSleepSelect={setSleep}/>
        {sleep !== undefined && <SleepForm initial={sleep || undefined} date={today()} onClose={() => setSleep(undefined)}/>}
    </div>;
}
