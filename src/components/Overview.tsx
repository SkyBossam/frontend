import { HomeObservationBanner } from './HomeObservationBanner';
import { observationLabel } from '../cryPresentation';
import { ArrowRight, Bell, ChevronRight, CircleAlert, Moon, Video, WifiOff } from 'lucide-react';
import { Badge, Button, Cloud } from '../components';
import { useApp } from '../context';
import { getSleepRisk, filterEvents, koreaDate, timeLabel, today, type CryEvent } from '../domain';
export function CryRow({ event, onSelect, notification = false, grouped = false }: {
    event: CryEvent;
    onSelect?: () => void;
    notification?: boolean;
    grouped?: boolean;
}) { const { go, data } = useApp(); const feedback = data.feedback.find(f => f.eventId === event.id && f.childId === event.childId); return <button className="cry-row" onClick={() => { onSelect?.(); go('/children/cries/' + event.id); }}><span className={'round-icon ' + (feedback ? 'play' : 'cry')}><Bell size={18}/></span><span className="cry-time">{timeLabel(event.startedAt)}<small>{koreaDate(new Date(event.startedAt)) === today() ? '오늘' : koreaDate(new Date(event.startedAt)).slice(5).replace('-', '.')}</small></span><span className="cry-copy"><strong>{notification ? `대응 대기 · 울음 ${event.alertOccurrences || 1}건` : grouped ? '울음 감지' : observationLabel(event)}</strong><span>{event.cause}</span></span><Badge tone={event.alertClosed || feedback?.response === 'stopped' ? 'green' : 'yellow'}>{event.alertClosed || feedback?.response === 'stopped' ? '대응 기록됨' : feedback ? '대응 중' : '대응 대기'}</Badge><ChevronRight size={16}/></button>; }
export function VideoPreview({ large = false }: {
    large?: boolean;
}) { const { go, data } = useApp(); return <button className={'video-preview ' + (large ? 'large' : '')} onClick={() => go('/monitor')} aria-label="실시간 모니터링 열기">{data.demo ? <><img src="/baby-demo.png" alt="잠든 아기의 시연 이미지. 실제 카메라 영상이 아닙니다."/><span className="video-label"><span />시연 이미지</span><span className="video-badge"><Moon size={14}/> 편안한 낮잠 시간</span><span className="video-bottom"><span><Video size={15}/> 아이의 작은 순간도 함께해요</span><span className="video-expand"><ArrowRight size={18}/></span></span></> : <div className="video-offline"><WifiOff size={32}/><strong>카메라가 연결되지 않았어요</strong><span>연결 상태를 확인해 주세요</span></div>}</button>; }
export function AlertBanner({ onAlert }: {
    onAlert: () => void;
}) { const { data, sky, go } = useApp(); if (!data.demo) return <HomeObservationBanner items={sky.snapshot?.items || []} cries={data.cries} childId={data.child?.id} childName={data.child?.name} go={go}/>; const active = data.alert && data.alert.status !== 'resolved'; return active ? <div className="alert-banner danger"><span className="alert-icon"><CircleAlert size={27}/></span><div><span className="eyebrow">즉시 확인 필요 · 시연 알림</span><h3>{getSleepRisk(data.alert!).message}</h3><p>{getSleepRisk(data.alert!).instruction}</p></div><Button variant="yellow" onClick={onAlert}>확인하러 가기 <ArrowRight size={16}/></Button></div> : <div className="alert-banner calm"><Cloud /><div><h3>새로운 감지 알림이 없어요.</h3><p>{data.demo ? data.child?.name + '의 평온한 하루를 함께 살펴요.' : '카메라 미연결 · 현재 상태는 직접 확인해 주세요.'}</p></div><span className="banner-sparkle">✧</span></div>; }
export function Timeline({ date = today() }: {
    date?: string;
}) {
    const { data, go } = useApp();
    const events = filterEvents(data.cries, data.child!.id, 'all').filter(e => koreaDate(new Date(e.startedAt)) === date);
    const dayStart = new Date(date + 'T00:00:00+09:00').getTime();
    const sleeps = data.sleepRecords.filter(r => r.childId === data.child!.id && new Date(r.endedAt).getTime() > dayStart && new Date(r.startedAt).getTime() < dayStart + 86400000);
    const activities = data.routines.filter(r => r.childId === data.child!.id && r.date === date && r.status === 'done' && ['play', 'soothe'].includes(r.type) && r.time && r.endTime);
    return <div className="timeline"><div className="timeline-legend"><span><i className="sleep-dot"/>수면</span><span><i className="cry-dot"/>울음</span><span><i className="play-dot"/>놀이·달래기</span></div><div className="timeline-track" aria-label="24시간 수면과 울음 기록">
 {sleeps.map(r => { const start = Math.max(0, new Date(r.startedAt).getTime() - dayStart); const end = Math.min(86400000, new Date(r.endedAt).getTime() - dayStart); return <span key={r.id} className="sleep-block" title={`수면 ${timeLabel(r.startedAt)}–${timeLabel(r.endedAt)}`} style={{ left: `${start / 864000}%`, width: `${(end - start) / 864000}%` }}/>; })}
 {activities.map(r => { const [h, m] = r.time.split(':').map(Number); const [eh, em] = r.endTime!.split(':').map(Number); const start = h * 60 + m; const end = Math.min(1440, eh * 60 + em < start ? eh * 60 + em + 1440 : eh * 60 + em); return <span key={r.id} className="play-block" title={r.title} style={{ left: `${start / 14.4}%`, width: `${(end - start) / 14.4}%` }}/>; })}
 {events.map(e => { const [hours, minutes] = timeLabel(e.startedAt).split(':').map(Number); return <button key={e.id} style={{ left: `${(hours + minutes / 60) / 24 * 100}%`, width: `${Math.min(100 - (hours + minutes / 60) / 24 * 100, Math.max(1, (e.durationSec || 60) / 86400 * 100))}%` }} aria-label={`${timeLabel(e.startedAt)} 울음 상세`} className="cry-block" onClick={() => go('/children/cries/' + e.id)}/>; })}</div><div className="timeline-hours"><span>00시</span><span>06시</span><span>12시</span><span>18시</span><span>24시</span></div>{!events.length && !sleeps.length && !activities.length && <p className="muted small-text">아직 기록된 활동이 없어요.</p>}</div>;
}
