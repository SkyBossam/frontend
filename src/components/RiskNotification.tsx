import { useEffect, useState } from 'react';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { Badge, Button, Modal } from '../components';
import { useApp } from '../context';
import { getSleepRisk, timeLabel, updateAlert } from '../domain';

// Each detection is announced once per browser session, without resolving it.
const announced = new Set<string>();
export function RiskNotification() {
    const { data, account, go, commit, busy } = useApp();
    const [openKey, setOpenKey] = useState<string | null>(null);
    const alert = data.alert;
    const eligible = !!(account && data.child && data.onboardingComplete && alert && alert.kind === 'posture' && alert.childId === data.child.id && alert.status !== 'resolved');
    const key = eligible && alert ? JSON.stringify([account, alert.childId, alert.id, alert.kind || 'face', alert.startedAt]) : '';
    useEffect(() => {
        if (!key) { setOpenKey(null); return; }
        let seen = announced.has(key);
        try { seen ||= sessionStorage.getItem('aicoo-risk-seen:' + key) === '1'; } catch { /* In-memory deduplication still applies. */ }
        if (seen) return;
        announced.add(key);
        try { sessionStorage.setItem('aicoo-risk-seen:' + key, '1'); } catch { /* Storage can be unavailable. */ }
        setOpenKey(key);
    }, [key]);
    if (!eligible || !alert || openKey !== key) return null;
    const close = () => setOpenKey(null);
    const risk = getSleepRisk(alert);
    return <div className="risk-notification-layer"><Modal title="위험 감지 알림" onClose={close}>
        <div className="alert-detail-header"><CircleAlert size={35}/><Badge tone="red">즉시 확인 필요{data.demo ? ' · 체험' : ''}</Badge><h2>{risk.message}</h2><p>{data.child?.name} · {timeLabel(alert.startedAt)} 감지</p></div>
        <div className="urgent-instruction">{risk.instruction}</div>
        <Button className="full" variant="danger" disabled={busy} onClick={async () => {
            const id = alert.id;
            const startedAt = alert.startedAt;
            const saved = await commit(d => d.alert?.id === id && d.alert.startedAt === startedAt && d.alert.status !== 'resolved' ? { ...d, alert: updateAlert(d.alert, 'check') } : d);
            if (saved) { close(); go('/monitor'); }
        }}>지금 확인하기 <ArrowRight size={17}/></Button>
        <Button className="full" variant="ghost" onClick={close}>나중에 확인</Button>
    </Modal></div>;
}
