import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { demoData, emptyData, type AppData, type Child } from './domain';
import { getSession, persistData, readData, setSession } from './store';
import { DeviceClient, type Child as ServerChild } from './api/deviceClient';
import { authContinuation, deviceLoginRoute, homeRoute, previewAccount, routeRedirect, withServerChild } from './sessionFlow';

type Change = AppData | ((previous: AppData) => AppData);
interface Context {
  data: AppData; account: string | null; path: string; busy: boolean; online: boolean;
  go: (path: string, replace?: boolean) => void;
  commit: (change: Change) => Promise<boolean>;
  toast: (message: string) => void;
  login: (email: string, password: string, mode: 'login' | 'signup') => Promise<void>;
  enterDemo: () => Promise<void>;
  logout: () => Promise<void>;
  api: DeviceClient; authenticated: boolean; emailVerified: boolean; verificationToken: string;
  verifyEmail: (token: string) => Promise<void>;
  workspaceId: string;
  saveChild: (child: Child) => Promise<boolean>;
  selectServerChild: (workspace: string, child: ServerChild) => Promise<void>;
}
const AppContext = createContext<Context>(null!);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: ReactNode }) {
  const [api] = useState(() => new DeviceClient(import.meta.env.VITE_API_BASE_URL || ''));
  const [account, setAccount] = useState(() => previewAccount(getSession()));
  const [authenticated, setAuthenticated] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false), [verificationToken, setVerificationToken] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [data, setData] = useState(() => readData(previewAccount(getSession())));
  const dataRef = useRef(data), storageAccount = useRef<string | null>(previewAccount(getSession()));
  const [path, setPath] = useState(window.location.pathname);
  const [busy, setBusy] = useState(false), locked = useRef(false);
  const [message, setMessage] = useState(''), toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const createChildRequest = useRef<{ body: string; key: string } | null>(null);
  const go = useCallback((next: string, replace = false) => {
    const url = new URL(next, window.location.href);
    if (url.origin !== window.location.origin) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url.pathname + url.search + url.hash);
    setPath(url.pathname); window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const toast = useCallback((text: string) => { setMessage(text); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setMessage(''), 4500); }, []);
  function resetAccount() {
    api.clear(); setAuthenticated(false); setEmailVerified(false); setVerificationToken(''); setWorkspaceId('');
    setAccount(null); storageAccount.current = null; createChildRequest.current = null;
    dataRef.current = emptyData(); setData(dataRef.current);
    try { setSession(null); } catch { /* In-memory logout still succeeds if storage is blocked. */ }
  }
  useEffect(() => {
    api.onSessionExpired = () => {
      const destination = window.location.pathname === '/devices' ? deviceLoginRoute(window.location.hash) : '/login';
      resetAccount(); toast('로그인이 만료됐어요. 다시 로그인해 주세요.'); go(destination, true);
    };
    return () => { api.onSessionExpired = undefined; api.clear(); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [api, go, toast]);
  useEffect(() => {
    const pop = () => setPath(window.location.pathname), network = () => setOnline(navigator.onLine);
    window.addEventListener('popstate', pop); window.addEventListener('online', network); window.addEventListener('offline', network);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('online', network); window.removeEventListener('offline', network); };
  }, []);
  useEffect(() => {
    if (busy) return;
    const redirect = routeRedirect(path, account, authenticated, data, window.location.search, window.location.hash);
    if (redirect) go(redirect, true);
  }, [account, authenticated, path, data.child, data.onboardingComplete, busy, go]);

  async function store(next: AppData) {
    if (!storageAccount.current) throw new Error('로그인이 필요해요.');
    await persistData(storageAccount.current, next); dataRef.current = next; setData(next);
  }
  const commit = async (change: Change) => {
    if (locked.current || !account) return false;
    locked.current = true; setBusy(true);
    try { await store(typeof change === 'function' ? change(dataRef.current) : change); return true; }
    catch (error) { toast(error instanceof Error ? error.message : '저장하지 못했어요.'); return false; }
    finally { locked.current = false; setBusy(false); }
  };
  const login = async (email: string, password: string, mode: 'login' | 'signup') => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    const continuation = authContinuation(window.location.search, window.location.hash);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const session = await api.authenticate(mode, normalizedEmail, password);
      const spaces = await api.workspaces();
      const workspace = spaces.items.find(item => item.type === 'PERSONAL') || spaces.items[0];
      if (!workspace) throw new Error('이 계정의 돌봄 공간을 찾지 못했어요.');
      const serverChildren = (await api.children(workspace.id)).items;
      const storageKey = `server:${session.userId || normalizedEmail}`;
      const previous = readData(storageKey);
      const child = serverChildren.find(item => item.id === previous.child?.id) || serverChildren[0] || null;
      const next = withServerChild(previous, child);
      if (child) next.onboardingComplete = true;
      storageAccount.current = storageKey; dataRef.current = next; setData(next);
      setAccount(normalizedEmail); setAuthenticated(true); setWorkspaceId(workspace.id);
      setEmailVerified(session.emailVerified === true); setVerificationToken(session.verificationToken || '');
      try { setSession(null); } catch { /* Credentials remain memory-only. */ }
      go(continuation || homeRoute(next), true);
    } catch (error) { api.clear(); throw error; }
    finally { locked.current = false; setBusy(false); }
  };
  const enterDemo = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const next = readData('demo').child ? readData('demo') : demoData();
      await persistData('demo', next); setSession('demo'); api.clear(); setAuthenticated(false);
      setEmailVerified(false); setVerificationToken(''); setWorkspaceId('');
      storageAccount.current = 'demo'; dataRef.current = next; setData(next); setAccount('demo'); go('/home');
    } catch { toast('브라우저 저장 공간에 접근할 수 없어요.'); }
    finally { locked.current = false; setBusy(false); }
  };
  const logout = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { if (authenticated) await api.logout(); }
    catch { toast('이 기기에서 로그아웃했어요. 서버에 연결하지 못했어요.'); }
    finally { resetAccount(); go('/welcome', true); locked.current = false; setBusy(false); }
  };
  const verifyEmail = async (token: string) => { await api.verify(token); setEmailVerified(true); setVerificationToken(''); };
  const selectServerChild = async (workspace: string, child: ServerChild) => {
    const next = withServerChild(dataRef.current, child); next.onboardingComplete = true;
    setWorkspaceId(workspace); dataRef.current = next; setData(next);
    if (storageAccount.current) await persistData(storageAccount.current, next).catch(() => toast('아이 정보는 서버에 저장됐지만 브라우저에 보관하지 못했어요.'));
  };
  const saveChild = async (child: Child) => {
    if (locked.current || !account) return false;
    locked.current = true; setBusy(true);
    try {
      let saved = child;
      if (authenticated) {
        const body = JSON.stringify([workspaceId, child.name, child.birthDate]);
        if (createChildRequest.current?.body !== body) createChildRequest.current = { body, key: crypto.randomUUID() };
        const result = dataRef.current.child
          ? await api.updateChild(workspaceId, dataRef.current.child.id, child.name, child.birthDate)
          : await api.createChild(workspaceId, child.name, child.birthDate, createChildRequest.current.key);
        saved = { ...child, id: result.id, name: result.displayName, birthDate: result.birthDate };
      }
      await store({ ...dataRef.current, child: saved }); return true;
    } catch (error) { toast(error instanceof Error ? error.message : '아이 정보를 저장하지 못했어요.'); return false; }
    finally { locked.current = false; setBusy(false); }
  };
  return <AppContext.Provider value={{ data, account, path, go, commit, busy, toast, login, enterDemo, logout, online, api, authenticated, emailVerified, verificationToken, verifyEmail, workspaceId, saveChild, selectServerChild }}>{children}<div className={'toast ' + (message ? 'show' : '')} role="status" aria-live="polite">{message}</div></AppContext.Provider>;
}
