import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Baby, Bell, ChevronRight, Heart, Home, Settings2, Video, WifiOff } from 'lucide-react';
import { AppProvider, useApp } from './context';
import { Brand, Button, Cloud, EmptyState, IconButton, Modal, NotificationBell, Profile } from './components';
import { filterEvents, getSleepRisk, updateAlert } from './domain';
import { CryRow } from './components/Overview';
import './styles.css';
import { pages } from './pageRegistry';
import { Devices } from './pages/Devices';
import type { ComponentType } from 'react';
function Unavailable(_props: {
    onAlert?: () => void;
    onClose?: () => void;
    Page?: ComponentType;
}) {
    return <EmptyState title="준비 중인 화면이에요" description="다음 페이지 커밋에서 연결됩니다."/>;
}
const nav = [{ path: '/home', label: '홈', icon: Home }, { path: '/children', label: '우리 아이', icon: Baby }, { path: '/monitor', label: '모니터링', icon: Video }, { path: '/more', label: '더보기', icon: Settings2 }];
function App() {
    const { Welcome = Unavailable, Auth = Unavailable, ChildSetup = Unavailable, AlertSetup = Unavailable, Dashboard = Unavailable, Summary = Unavailable, ChildManagement = Unavailable, Routines = Unavailable, CryList = Unavailable, CryFlow = Unavailable, CryDetail, Recommendations, ActionLog, Response, Complete, Monitor = Unavailable, AlertModal = Unavailable, Settings = Unavailable } = pages;
    const { data, path, go, account, authenticated, commit, online } = useApp();
    const [alertOpen, setAlertOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const cryNotifications = data.child ? filterEvents(data.cries, data.child.id, 'all').filter(event => !data.feedback.some(f => f.eventId === event.id && f.childId === event.childId)) : [];
    const pendingCries = cryNotifications.length > 0;
    const active = data.alert && data.alert.status !== 'resolved';
    const openAlert = async () => { setAlertOpen(true); if (data.alert && data.alert.status !== 'resolved')
        await commit(d => ({ ...d, alert: updateAlert(d.alert!, 'open') })); };
    useEffect(() => { if (path.startsWith('/alerts/')) {
        setAlertOpen(true);
    } }, [path]);
    useEffect(() => { document.title = (path === '/home' ? '오늘의 돌봄' : path.startsWith('/children') ? '우리 아이' : path === '/monitor' ? '모니터링' : '우리 아이의 편안한 하루') + ' · 아이쿠'; }, [path]);
    if (path === '/devices') return authenticated ? <Devices /> : null;
    if (path === '/signup' || path === '/login')
        return <Auth key={path}/>;
    if (path === '/onboarding/child' && account)
        return <ChildSetup />;
    if (path === '/onboarding/notifications' && account && data.child)
        return <AlertSetup />;
    if (!account || !data.child || !data.onboardingComplete || path === '/welcome')
        return <Welcome />;
    const selected = path.startsWith('/children') ? '/children' : path.startsWith('/monitor') ? '/monitor' : path.startsWith('/more') ? '/more' : '/home';
    const navigation = (mobile = false) => <nav className={mobile ? 'bottom-nav' : 'side-nav'} aria-label={mobile ? '하단 내비게이션' : '주 내비게이션'}>{nav.map(item => <button key={item.path} aria-current={selected === item.path ? 'page' : undefined} className={selected === item.path ? 'active' : ''} onClick={() => go(item.path)}><item.icon size={mobile ? 22 : 21}/><span>{item.label}</span>{!mobile && selected === item.path && <span className="nav-active-dot"/>}</button>)}</nav>;
    return <div className="app-shell"><a className="skip-link" href="#main-content">본문으로 이동</a><aside className="sidebar"><button className="brand-link" onClick={() => go('/home')}><Brand /></button><span className="sidebar-label">우리 가족의 작은 안심</span>{navigation()}<div className="sidebar-care"><Cloud /><strong>잘하고 있어요, 보호자님</strong><p>완벽하지 않아도 괜찮아요.<br />함께하는 마음이면 충분해요.</p><Heart size={14}/></div><button className="sidebar-profile" onClick={() => go('/children')}><Profile child={data.child} compact/><ChevronRight size={18}/></button></aside><div className="app-body"><header className="topbar"><div className="desktop-only breadcrumb">우리 가족의 돌봄 공간 <ChevronRight size={13}/><strong>{nav.find(n => n.path === selected)?.label}</strong></div><button className="mobile-brand" onClick={() => go('/home')}><Brand small/></button><div className="topbar-right">{data.demo && <span className="preview-label"><span /> 체험모드</span>}<IconButton label={active || pendingCries ? '미확인 알림 보기' : '알림 보기'} onClick={() => setNotificationsOpen(true)}>{active || pendingCries ? <NotificationBell /> : <Bell size={20}/>}</IconButton><button className="account-avatar" aria-label="계정 설정" onClick={() => go('/more')}>보</button></div></header>{!online && <div className="offline-banner" role="status"><WifiOff size={16}/> 네트워크가 끊겼어요. 이 기기에 저장한 기록은 계속 확인할 수 있어요.</div>}<main className="main-content" id="main-content">{path === '/home' ? <Dashboard onAlert={openAlert}/> : path === '/home/summary' ? <Summary /> : path === '/children' ? <ChildManagement /> : path === '/children/routines' ? <Routines /> : path === '/children/cries' ? <CryList /> : path.startsWith('/children/cries/') ? <CryFlow key={path.split('/')[3]} Page={({ recommendations: Recommendations, actions: ActionLog, response: Response, complete: Complete } as Record<string, ComponentType | undefined>)[path.split('/')[4]] || CryDetail}/> : path === '/monitor' ? <Monitor onAlert={openAlert}/> : path === '/more' ? <Settings /> : path.startsWith('/alerts/') ? <Dashboard onAlert={openAlert}/> : <EmptyState title="페이지를 찾을 수 없어요" action={<Button onClick={() => go('/home')}>홈으로 돌아가기</Button>}/>}</main><footer className="app-footer"><span>아이쿠</span><span>작은 신호에 귀 기울이는, 따뜻한 돌봄</span><span>Made with care <Heart size={11}/></span></footer></div>{navigation(true)}{notificationsOpen && <Modal title="감지 알림" onClose={() => setNotificationsOpen(false)}>{active && <Button variant="yellow" className="full" onClick={() => { setNotificationsOpen(false); void openAlert(); }}>{getSleepRisk(data.alert!).message} <ChevronRight size={18}/></Button>}{cryNotifications.map(event => <CryRow key={event.id} event={event} onSelect={() => setNotificationsOpen(false)}/>)}{!active && !cryNotifications.length && <p className="muted">알림이 없어요.</p>}</Modal>}{alertOpen && <AlertModal onClose={() => { setAlertOpen(false); if (path.startsWith('/alerts/'))
        go('/home'); }}/>}</div>;
}
createRoot(document.getElementById('root')!).render(<AppProvider><App /></AppProvider>);
