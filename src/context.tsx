import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { demoData, emptyData, type AppData } from './domain';
import { getSession, persistData, readData, setSession } from './store';
type Change = AppData | ((previous: AppData) => AppData);
interface Context {
    data: AppData;
    account: string | null;
    path: string;
    go: (path: string) => void;
    commit: (change: Change) => Promise<boolean>;
    busy: boolean;
    toast: (message: string) => void;
    login: (account: string, demo?: boolean) => Promise<void>;
    logout: () => void;
    online: boolean;
}
const AppContext = createContext<Context>(null!);
export const useApp = () => useContext(AppContext);
export function AppProvider({ children }: {
    children: ReactNode;
}) {
    const [account, setAccount] = useState(getSession);
    const [data, setData] = useState(() => readData(getSession()));
    const dataRef = useRef(data);
    const [path, setPath] = useState(window.location.pathname);
    const [busy, setBusy] = useState(false);
    const locked = useRef(false);
    const [message, setMessage] = useState('');
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [online, setOnline] = useState(navigator.onLine);
    const go = (next: string) => { window.history.pushState({}, '', next); setPath(next); window.scrollTo({ top: 0, behavior: 'instant' }); };
    const toast = (text: string) => { setMessage(text); if (toastTimer.current)
        clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setMessage(''), 4500); };
    useEffect(() => { const pop = () => setPath(window.location.pathname); const network = () => setOnline(navigator.onLine); window.addEventListener('popstate', pop); window.addEventListener('online', network); window.addEventListener('offline', network); return () => { window.removeEventListener('popstate', pop); window.removeEventListener('online', network); window.removeEventListener('offline', network); }; }, []);
    useEffect(() => { if (path === '/devices') return; const auth = ['/welcome', '/signup', '/login']; if (!account && !auth.includes(path))
        go('/welcome');
    else if (account && (!data.child) && !['/onboarding/child', '/signup', '/login'].includes(path))
        go('/onboarding/child');
    else if (account && data.child && !data.onboardingComplete && path !== '/onboarding/notifications' && path !== '/onboarding/child')
        go('/onboarding/notifications');
    else if (account && data.onboardingComplete && (['/', '/welcome', '/signup', '/login'].includes(path)))
        go('/home'); }, [account, path, data.child, data.onboardingComplete]);
    const commit = async (change: Change) => { if (locked.current || !account)
        return false; locked.current = true; setBusy(true); try {
        const next = typeof change === 'function' ? change(dataRef.current) : change;
        await persistData(account, next);
        dataRef.current = next;
        setData(next);
        return true;
    }
    catch (e) {
        toast(e instanceof Error ? e.message : '저장하지 못했어요. 다시 시도해 주세요.');
        return false;
    }
    finally {
        locked.current = false;
        setBusy(false);
    } };
    const login = async (email: string, demo = false) => { if (locked.current)
        return; locked.current = true; setBusy(true); try {
        const next = demo ? (readData('demo').child ? readData('demo') : demoData()) : readData(email);
        await persistData(demo ? 'demo' : email, next);
        setSession(demo ? 'demo' : email);
        dataRef.current = next;
        setData(next);
        setAccount(demo ? 'demo' : email);
        go(next.onboardingComplete ? '/home' : next.child ? '/onboarding/notifications' : '/onboarding/child');
    }
    catch {
        toast('브라우저 저장 공간에 접근할 수 없어요. 사이트 저장 권한을 확인해 주세요.');
    }
    finally {
        locked.current = false;
        setBusy(false);
    } };
    const logout = () => { setSession(null); setAccount(null); setData(emptyData()); dataRef.current = emptyData(); go('/welcome'); };
    return <AppContext.Provider value={{ data, account, path, go, commit, busy, toast, login, logout, online }}>{children}<div className={'toast ' + (message ? 'show' : '')} role="status" aria-live="polite">{message}</div></AppContext.Provider>;
}
