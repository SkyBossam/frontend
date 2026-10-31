import { emptyData, type AppData } from './domain';
const prefix = 'aicoo-v1:';
export const getSession = (): string | null => { try {
    return sessionStorage.getItem(prefix + 'session');
}
catch {
    return null;
} };
export const setSession = (account: string | null) => { if (account)
    sessionStorage.setItem(prefix + 'session', account);
else
    sessionStorage.removeItem(prefix + 'session'); };
export function readData(account: string | null): AppData { if (!account)
    return emptyData(); try {
    const raw = localStorage.getItem(prefix + account);
    if (!raw)
        return emptyData();
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.cries) && Array.isArray(parsed.routines) && Array.isArray(parsed.feedback) ? { ...emptyData(), ...parsed } : emptyData();
}
catch {
    return emptyData();
} }
/** Mock persistence adapter. Replace this boundary with the API in docs/data-contracts.md. */
export async function persistData(account: string, data: AppData): Promise<AppData> {
    await new Promise(resolve => setTimeout(resolve, 180));
    try {
        localStorage.setItem(prefix + account, JSON.stringify(data));
        return data;
    }
    catch {
        throw new Error('기록을 저장하지 못했어요. 브라우저 저장 공간과 접근 권한을 확인한 뒤 다시 시도해 주세요.');
    }
}
