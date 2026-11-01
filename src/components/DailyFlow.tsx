import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, ChevronRight, CircleHelp, Moon, Sparkles, Clock3 } from 'lucide-react';
import { Badge } from '../components';
import { predictDailyCare, predictionActionLabel, predictionTime } from '../dailyPredictions';
import { useApp } from '../context';
import { koreaDate, responseLabels, timeLabel, type SleepRecord } from '../domain';

export function DailyFlow({ expanded = false, selectedDate, onSleepSelect }: { expanded?: boolean; selectedDate?: string; onSleepSelect?: (record: SleepRecord) => void }) {
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
    }, [data.cries, data.feedback, selectedDate]);
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
    const date = selectedDate || koreaDate();
    const dayStart = new Date(date + 'T00:00:00+09:00').getTime();
    const prediction = predictDailyCare(data.cries, data.feedback, child.id, date);
    const predicted = prediction.periods.some(period => period.reason === 'predicted');
    const records = [
        ...data.sleepRecords.filter(r => r.childId === child.id && Date.parse(r.startedAt) < dayStart + 86400000 && Date.parse(r.endedAt) > dayStart).map(r => ({
            id: 'sleep-' + r.id, at: Math.max(dayStart, Date.parse(r.startedAt)),
            time: `${timeLabel(new Date(Math.max(dayStart, Date.parse(r.startedAt))).toISOString())}–${timeLabel(new Date(Math.min(dayStart + 86400000 - 1, Date.parse(r.endedAt))).toISOString())}`,
            title: '수면 기록', detail: '', path: '/children/history', Icon: Moon, select: () => onSleepSelect ? onSleepSelect(r) : go('/children/history'),
        })),
        ...data.cries.filter(r => r.childId === child.id && koreaDate(new Date(r.startedAt)) === date).map(r => {
            const feedback = data.feedback.find(f => f.eventId === r.id && f.childId === child.id);
            return { id: 'cry-' + r.id, at: Date.parse(r.startedAt), time: timeLabel(r.startedAt), title: '울음 감지', detail: feedback ? responseLabels[feedback.response] : '대응 미기록', path: '/children/cries/' + r.id, Icon: Bell, select: () => go('/children/cries/' + r.id) };
        }),
    ].sort((a, b) => a.at - b.at);
    return <section className={`card daily-flow-card ${expanded ? 'daily-flow-expanded' : ''}`}>
        <div className="section-heading"><div className="daily-flow-heading"><h2>{expanded ? `${child.name}의 하루 흐름` : <button className="daily-flow-title-link" onClick={() => go('/children/daily-flow')}>{child.name}의 하루 흐름</button>}</h2>
            <div className="flow-help" onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)}>
                <button ref={helpButton} type="button" className="flow-help-button" aria-label="하루 흐름 설명" aria-describedby={showHelp ? helpId : undefined} aria-expanded={showHelp} onClick={() => setShowHelp(true)} onFocus={() => setShowHelp(true)} onBlur={() => setShowHelp(false)} onKeyDown={e => { if (e.key === 'Escape') setShowHelp(false); }}><CircleHelp size={16}/></button>
                {showHelp && createPortal(<div ref={tooltip} style={helpPosition} className="flow-tooltip" role="tooltip" id={helpId}>최근 7일의 울음 감지 시간과 울음이 그친 돌봄 결과를 30분씩 살펴봐요. 같은 행동이 최소 2일 이상 기록된 시간대에서 가장 많은 날짜에 도움이 된 행동을 표시해요. 동률이면 예상을 보류하고, 연속된 같은 행동은 합쳐서 보여줘요. 실제로 필요한 돌봄과 다를 수 있어요.</div>, document.body)}
            </div></div></div>
        <p className="section-description">최근 7일 · {prediction.fromDate} ~ {prediction.throughDate}</p>
        <div className="daily-prediction-intro"><Badge>예상 돌봄</Badge><p>울음이 그친 돌봄 결과를 바탕으로 시간대별 행동을 예상해요.</p></div>
        {data.demo && <p className="section-description">체험용 기록으로 만든 예상이에요.</p>}
        {!predicted && <p className="daily-prediction-empty">하루 패턴을 알아가는 중이에요. 같은 시간대에 최소 2일 이상 도움이 된 돌봄이 쌓이면 예상 행동을 보여드려요.</p>}
        <div className={`daily-flow-scroll ${scrollHints.top ? 'has-more-above' : ''} ${scrollHints.bottom ? 'has-more-below' : ''}`}>
            <div ref={recordsContainer} onScroll={updateScrollHints} className="daily-flow-records" tabIndex={0} role="region" aria-label="시간대별 예상 돌봄, 위아래로 스크롤">
                <ol className="daily-prediction-list">{prediction.periods.map(period => <li className={'daily-prediction-row ' + (period.reason === 'predicted' ? 'predicted' : 'unknown')} key={period.startMinute}>
                    <span className="daily-prediction-time">{predictionTime(period.startMinute)}–{predictionTime(period.endMinute)}</span>
                    {period.reason === 'predicted' ? <Sparkles size={17} aria-hidden="true"/> : <Clock3 size={17} aria-hidden="true"/>}
                    <div><strong>{period.reason === 'predicted' ? period.actions.map(predictionActionLabel).join(' + ') + ' 예상' : period.reason === 'mixed' ? '돌봄 패턴이 엇갈려요' : '예측할 기록 부족'}</strong>
                        {period.reason === 'predicted' && <small>최근 7일 중 {period.days}일 · 울음 그침 {period.successes}건</small>}
                    </div>
                </li>)}</ol>
            </div>
        </div>
        <p className="card-footnote">각 시간대의 과거 대응 결과에 따른 예상이에요. 아이의 현재 상태를 먼저 확인해 주세요.</p>
        {expanded && <div className="daily-actual-records"><h3>이날의 실제 기록</h3>{records.length ? records.map(r => <button className="daily-flow-row" key={r.id} onClick={r.select}><span className="daily-flow-time">{r.time}</span><r.Icon size={16}/><span><strong>{r.title}</strong>{r.detail && <small>{r.detail}</small>}</span><ChevronRight size={14}/></button>) : <p className="section-description">선택한 날짜의 수면·울음 기록이 없어요.</p>}</div>}

    </section>;
}
