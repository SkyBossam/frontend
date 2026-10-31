export interface Session { accessToken: string; refreshToken: string; userId?: string; emailVerified?: boolean; verificationToken?: string }
export interface Workspace { id: string; name: string; role: string; type: string }
export interface Child { id: string; displayName: string; birthDate: string; capabilities: string[] }
export interface Device { id: string; name: string; childId: string; connected: boolean; state: string; lastSeenAt: string | null; pairedAt: string; fingerprint: string; canManage: boolean }
export interface Pairing { pairingId: string; status: string; expiresAt: string; fingerprint: string }
export function normalizeApiBaseUrl(value: string) {
  // Accept either an origin or the API base copied from the backend documentation.
  return value.trim().replace(/\/+$/, '').replace(/\/api(?:\/v1)?$/, '');
}
export class ApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
export function normalizePairingCode(value: string) {
  const code = value.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) throw new Error('파이에 표시된 영문·숫자 8자리를 입력해 주세요.');
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
const messages: Record<string, string> = {
  PAIRING_CODE_NOT_FOUND: '연결 코드를 찾지 못했어요. 파이에 표시된 코드를 확인해 주세요.',
  PAIRING_EXPIRED: '코드가 만료됐어요. 파이에서 새 코드를 발급해 주세요.',
  PAIRING_CANCELLED: '취소된 코드예요. 파이에 표시된 최신 코드를 입력해 주세요.',
  PAIRING_ALREADY_USED: '이미 사용한 코드예요. 연결된 기기를 확인해 주세요.',
  DEVICE_ALREADY_PAIRED: '이미 연결된 파이예요. 기존 보호자가 연결을 해제해야 해요.',
  PAIRING_RATE_LIMITED: '확인 요청이 많아요. 15분 뒤 다시 시도해 주세요.',
  EMAIL_VERIFICATION_REQUIRED: '이메일 인증을 먼저 완료해 주세요.',
};
/** Account credentials live only in memory. Device credentials never reach this client. */
export class DeviceClient {
  onSessionExpired?: () => void;
  private baseUrl: string;
  private session: Session | null = null;
  private refreshing: Promise<void> | null = null;
  private generation = 0;
  constructor(baseUrl = '') { this.baseUrl = normalizeApiBaseUrl(baseUrl); }
  clear() { this.generation++; this.session = null; this.refreshing = null; }
  private async refresh() {
    if (!this.refreshing) {
      const token = this.session?.refreshToken;
      const generation = this.generation;
      this.refreshing = this.request<Session>('POST', '/auth/refresh', { refreshToken: token }, undefined, undefined, false)
        .then(session => { if (generation !== this.generation) throw new ApiError(401, 'SESSION_CHANGED', '다시 로그인해 주세요.'); this.session = session; })
        .catch(error => { if (generation === this.generation) { this.clear(); this.onSessionExpired?.(); } throw error; })
        .finally(() => { if (generation === this.generation) this.refreshing = null; });
    }
    return this.refreshing;
  }
  async request<T>(method: string, path: string, body?: unknown, workspace?: string, key?: string, retry = true): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    const access = this.session?.accessToken;
    if (access) headers.set('Authorization', `Bearer ${access}`);
    if (workspace) headers.set('X-Workspace-Id', workspace);
    if (key) headers.set('Idempotency-Key', key);
    let response: Response;
    try { response = await fetch(`${this.baseUrl}/api/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', credentials: 'omit', redirect: 'error' }); }
    catch { throw new Error('서버에 연결하지 못했어요. 네트워크와 아이쿠 서버 주소를 확인해 주세요.'); }
    if (response.status === 401 && retry && this.session && !path.startsWith('/auth/')) {
      // Another concurrent request may already have rotated the access token.
      if (access === this.session.accessToken) await this.refresh();
      return this.request<T>(method, path, body, workspace, key, false);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/auth/') && this.session) { this.clear(); this.onSessionExpired?.(); }
      if (response.status === 404 && path.startsWith('/auth/')) throw new ApiError(404, 'API_ROUTE_NOT_FOUND', '로그인 서버를 찾지 못했어요. 서버 연결 주소와 배포 설정을 확인해 주세요.');
      const code = data?.error?.code ?? 'API_ERROR';
      throw new ApiError(response.status, code, messages[code] ?? data?.error?.message ?? `요청에 실패했어요 (${response.status}).`);
    }
    if (!data) throw new Error('서버 응답을 확인할 수 없어요. API 주소를 확인해 주세요.');
    return data as T;
  }
  async authenticate(mode: 'login' | 'signup', email: string, password: string) {
    const session = await this.request<Session>('POST', `/auth/${mode}`, { email, password });
    this.generation++; this.refreshing = null; this.session = session; return session;
  }
  async logout() { try { await this.request('POST', '/auth/logout', {}); } finally { this.clear(); } }
  verify(token: string) { return this.request('POST', '/auth/verify-email', { token }); }
  resend(email: string) { return this.request<{ verificationToken?: string }>('POST', '/auth/request-verification', { email }); }
  workspaces() { return this.request<{ items: Workspace[] }>('GET', '/me/workspaces'); }
  children(workspace: string) { return this.request<{ items: Child[] }>('GET', '/children', undefined, workspace); }
  createChild(workspace: string, displayName: string, birthDate: string, key: string) { return this.request<Child>('POST', '/children', { displayName, birthDate }, workspace, key); }
  updateChild(workspace: string, child: string, displayName: string, birthDate: string) { return this.request<Pick<Child, 'id' | 'displayName' | 'birthDate'>>('PATCH', `/children/${encodeURIComponent(child)}`, { displayName, birthDate }, workspace); }
  devices(workspace: string, child: string) { return this.request<{ items: Device[] }>('GET', `/children/${encodeURIComponent(child)}/devices`, undefined, workspace); }
  inspect(workspace: string, code: string) { return this.request<Pairing>('POST', '/device-pairings/inspect', { code: normalizePairingCode(code) }, workspace); }
  approve(workspace: string, childId: string, code: string, name: string, key: string) { return this.request('POST', '/device-pairings/approve', { code: normalizePairingCode(code), childId, name }, workspace, key); }
  unlink(workspace: string, device: string) { return this.request('DELETE', `/devices/${encodeURIComponent(device)}`, undefined, workspace); }
}
