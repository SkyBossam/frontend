import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, DeviceClient, normalizePairingCode } from '../src/api/deviceClient.ts';
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

test('pairing codes normalize pasted links codes but reject ambiguous or malformed values', () => {
  assert.equal(normalizePairingCode(' abcd 2345 '), 'ABCD-2345');
  for (const invalid of ['ABCD-1234', 'ABCD-I234', 'ABCD-O234', '', 'ABCD-23456']) assert.throws(() => normalizePairingCode(invalid));
});
test('approval keeps child scope and idempotency key; never calls a device credential endpoint', async context => {
  const requests: { url: string; init: RequestInit }[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => { requests.push({ url, init }); return response({ status: 'approved' }); });
  const client = new DeviceClient('https://api.example/');
  await client.approve('workspace-a', 'child-b', 'abcd2345', 'Camera', 'stable-key');
  const { url, init } = requests[0];
  assert.equal(url, 'https://api.example/api/v1/device-pairings/approve');
  assert.equal(new Headers(init.headers).get('X-Workspace-Id'), 'workspace-a');
  assert.equal(new Headers(init.headers).get('Idempotency-Key'), 'stable-key');
  assert.equal(new Headers(init.headers).has('X-Device-Token'), false);
  assert.deepEqual(JSON.parse(String(init.body)), { code: 'ABCD-2345', childId: 'child-b', name: 'Camera' });
  assert.equal(init.credentials, 'omit');
});
test('concurrent expired requests share refresh and retain their original workspace', async context => {
  let refreshes = 0;
  const scopes: string[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    if (url.endsWith('/auth/login')) return response({ accessToken: 'old', refreshToken: 'refresh' });
    if (url.endsWith('/auth/refresh')) { refreshes++; await new Promise(resolve => setTimeout(resolve, 5)); return response({ accessToken: 'new', refreshToken: 'rotated' }); }
    const headers = new Headers(init.headers);
    if (headers.get('Authorization') === 'Bearer old') return response({}, 401);
    assert.equal(headers.get('Authorization'), 'Bearer new'); scopes.push(headers.get('X-Workspace-Id')!);
    return response({ items: [] });
  });
  const client = new DeviceClient(); await client.authenticate('login', 'synthetic@example.test', 'test-password');
  await Promise.all([client.children('first'), client.children('second')]);
  assert.equal(refreshes, 1); assert.deepEqual(scopes.sort(), ['first', 'second']);
});
test('failed refresh clears credentials and does not retry a mutation', async context => {
  let approvals = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    if (url.endsWith('/auth/login')) return response({ accessToken: 'old', refreshToken: 'refresh' });
    if (url.endsWith('/auth/refresh')) return response({ error: { code: 'INVALID_REFRESH_TOKEN' } }, 401);
    if (url.endsWith('/approve')) { approvals++; return response({}, 401); }
    assert.equal(new Headers(init.headers).has('Authorization'), false); return response({ items: [] });
  });
  const client = new DeviceClient(); await client.authenticate('login', 'synthetic@example.test', 'test-password');
  await assert.rejects(client.approve('ws', 'child', 'ABCD2345', 'Camera', 'key'), ApiError);
  assert.equal(approvals, 1); await client.workspaces();
});
test('API errors, offline requests and non-API HTML cannot become a successful pairing', async context => {
  const mock = context.mock.method(globalThis, 'fetch', async () => response({ error: { code: 'PAIRING_EXPIRED' } }, 409));
  const client = new DeviceClient();
  await assert.rejects(client.inspect('ws', 'ABCD2345'), (error: unknown) => error instanceof ApiError && error.code === 'PAIRING_EXPIRED');
  mock.mock.mockImplementation(async () => { throw new TypeError('offline'); });
  await assert.rejects(client.inspect('ws', 'ABCD2345'), /서버에 연결하지/);
  mock.mock.mockImplementation(async () => new Response('<html>SPA fallback</html>'));
  await assert.rejects(client.inspect('ws', 'ABCD2345'), /API 주소/);
});
test('unlink uses the selected workspace and an encoded device path', async context => {
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => { assert.equal(url, '/api/v1/devices/device%2Fid'); assert.equal(init.method, 'DELETE'); assert.equal(new Headers(init.headers).get('X-Workspace-Id'), 'ws'); return response({ unlinked: true }); });
  await new DeviceClient().unlink('ws', 'device/id');
});
test('late refresh cannot restore a cleared login session', async context => {
  let finishRefresh!: (response: Response) => void;
  let started!: () => void;
  const refreshing = new Promise<void>(resolve => { started = resolve; });
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    if (url.endsWith('/auth/login')) return response({ accessToken: 'old', refreshToken: 'refresh' });
    if (url.endsWith('/auth/refresh')) { started(); return new Promise<Response>(resolve => { finishRefresh = resolve; }); }
    const auth = new Headers(init.headers).get('Authorization');
    if (auth === 'Bearer old') return response({}, 401);
    assert.equal(auth, null); return response({ items: [] });
  });
  const client = new DeviceClient(); await client.authenticate('login', 'synthetic@example.test', 'test-password');
  const pending = client.children('ws'); const rejected = assert.rejects(pending, ApiError);
  await refreshing; client.clear(); finishRefresh(response({ accessToken: 'late', refreshToken: 'late-refresh' }));
  await rejected; await client.workspaces();
});
