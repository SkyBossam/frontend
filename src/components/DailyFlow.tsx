import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, ChevronRight, CircleHelp, Moon } from 'lucide-react';
import { Badge } from '../components';
import { useApp } from '../context';
import { koreaDate, responseLabels, timeLabel } from '../domain';

export function DailyFlow() {
    const { data, go } = useApp();
    const [showHelp, setShowHelp] = useState(false);
    const helpId = useId();
    const recordsContainer = useRef<HTMLDivElement>(null);
    const [scrollHints, setScrollHints] = useState({ top: false, bottom: false });
    const updateScrollHints = () => {
        const el = recordsContainer.current;
        if (!el) return;
        setScrollHints({ top: el.scrollTop > 1, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1 });
    };
    useLayoutEffect(() => {
        const el = recordsContainer.current;
        if (!el) return;
        updateScrollHints();
        const observer = new ResizeObserver(updateScrollHints);
        observer.observe(el);
        for (const child of el.children) observer.observe(child);
        return () => observer.disconnect();
    }, [data.sleepRecords, data.cries, data.feedback]);
    const helpButton = useRef<HTMLButtonElement>(null);
    const tooltip = useRef<HTMLDivElement>(null);
    const [helpPosition, setHelpPosition] = useState({ left: 12, top: 12 });
    useLayoutEffect(() => {
        if (!showHelp) return;
        const positionHelp = () => {
            if (!helpButton.current || !tooltip.current) return;
            const viewport = window.visualViewport;
            const x = viewport?.offsetLeft ?? 0;
            const y = viewport?.offsetTop ?? 0;
            const width = viewport?.width ?? document.documentElement.clientWidth;
            const height = viewport?.height ?? window.innerHeight;
            const box = tooltip.current;
            box.style.maxWidth = `${Math.max(0, width - 24)}px`;
            box.style.maxHeight = `${Math.max(0, height - 24)}px`;
            const anchor = helpButton.current.getBoundingClientRect();
            const bounds = box.getBoundingClientRect();
            const left = Math.max(x + 12, Math.min(anchor.left + anchor.width / 2 - bounds.width / 2, x + width - bounds.width - 12));
            const preferredTop = anchor.bottom + 8 + bounds.height <= y + height - 12 ? anchor.bottom + 8 : anchor.top - bounds.height - 8;
            const top = Math.max(y + 12, Math.min(preferredTop, y + height - bounds.height - 12));
            setHelpPosition({ left, top });
        };
        positionHelp();
        window.addEventListener('resize', positionHelp);
        window.addEventListener('scroll', positionHelp, true);
        window.visualViewport?.addEventListener('resize', positionHelp);
        window.visualViewport?.addEventListener('scroll', positionHelp);
        return () => {
            window.removeEventListener('resize', positionHelp);
            window.removeEventListener('scroll', positionHelp, true);
            window.visualViewport?.removeEventListener('resize', positionHelp);
            window.visualViewport?.removeEventListener('scroll', positionHelp);
        };
    }, [showHelp]);
    const child = data.child!;
    const date = koreaDate();
    const dayStart = new Date(date + 'T00:00:00+09:00').getTime();
    const records = [
        ...data.sleepRecords.filter(r => r.childId === child.id && Date.parse(r.startedAt) < dayStart + 86400000 && Date.parse(r.endedAt) > dayStart).map(r => ({
            id: 'sleep-' + r.id, at: Math.max(dayStart, Date.parse(r.startedAt)),
            time: `${timeLabel(new Date(Math.max(dayStart, Date.parse(r.startedAt))).toISOString())}–${timeLabel(r.endedAt)}`,
            title: '수면 기록', detail: '', path: '/home/summary', Icon: Moon,
        })),
        ...data.cries.filter(r => r.childId === child.id && koreaDate(new Date(r.startedAt)) === date).map(r => {
            const feedback = data.feedback.find(f => f.eventId === r.id && f.childId === child.id);
            return { id: 'cry-' + r.id, at: Date.parse(r.startedAt), time: timeLabel(r.startedAt), title: '울음 감지', detail: feedback ? responseLabels[feedback.response] : '대응 미기록', path: '/children/cries/' + r.id, Icon: Bell };
        }),
    ].sort((a, b) => a.at - b.at);
    return <section className="card daily-flow-card">
        <div className="section-heading"><div className="daily-flow-heading"><h2>{child.name}의 하루 흐름</h2>
            <div className="flow-help" onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)}>
                <button ref={helpButton} type="button" className="flow-help-button" aria-label="하루 흐름 설명" aria-describedby={showHelp ? helpId : undefined} aria-expanded={showHelp} onClick={() => setShowHelp(true)} onFocus={() => setShowHelp(true)} onBlur={() => setShowHelp(false)} onKeyDown={e => { if (e.key === 'Escape') setShowHelp(false); }}><CircleHelp size={16}/></button>
                {showHelp && createPortal(<div ref={tooltip} style={helpPosition} className="flow-tooltip" role="tooltip" id={helpId}>수면·울음 기록을 시간순으로 보여줘요. 수면 예상은 기록이 충분히 쌓인 뒤 제공되며, 실제 활동과 다를 수 있어요.</div>, document.body)}
            </div></div><button className="text-button" onClick={() => go('/home/summary')}>전체 보기<ChevronRight size={15}/></button></div>
        {data.demo && <p className="section-description">체험용 하루 기록이에요.</p>}
        <div className={`daily-flow-scroll ${scrollHints.top ? 'has-more-above' : ''} ${scrollHints.bottom ? 'has-more-below' : ''}`}><div ref={recordsContainer} onScroll={updateScrollHints} className="daily-flow-records" tabIndex={0} role="region" aria-label="하루 흐름 기록, 위아래로 스크롤">{records.length ? records.map(r => <button className="daily-flow-row" key={r.id} onClick={() => go(r.path)}><span className="daily-flow-time">{r.time}</span><r.Icon size={16}/><span><strong>{r.title}</strong>{r.detail && <small>{r.detail}</small>}</span><ChevronRight size={14}/></button>) : <p className="section-description">아직 오늘의 수면·울음 기록이 없어요.</p>}</div></div>
        <div className="daily-flow-prediction"><Badge tone="gray">수면 예상</Badge><strong>하루 패턴을 알아가는 중이에요</strong><p>수면 기록을 모아 다음 수면 시간대를 안내할 예정이에요.</p></div>
    </section>;
}
