import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, SESSION_INVALIDATED_EVENT } from '../src/utils/apiFetch';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('API authentication recovery', () => {
  it('uses one refresh rotation for simultaneous unauthorized requests', async () => {
    localStorage.setItem('lms_jwt_token', 'stale-access-token');
    let refreshCalls = 0;
    let protectedCalls = 0;

    vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === '/api/auth/refresh') {
        refreshCalls += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 5));
        return new Response(JSON.stringify({ accessToken: 'fresh-access-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      protectedCalls += 1;
      const authorization = new Headers(init?.headers).get('Authorization');
      return new Response(null, {
        status: authorization === 'Bearer fresh-access-token' ? 200 : 401,
      });
    });

    const responses = await Promise.all([
      apiFetch('/api/db/state', { feedback: false }),
      apiFetch('/api/db/notifications/user-stu-1', { feedback: false }),
      apiFetch('/api/db/notification-preferences/user-stu-1', { feedback: false }),
    ]);

    expect(responses.every((response) => response.ok)).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(6);
    expect(localStorage.getItem('lms_jwt_token')).toBe('fresh-access-token');
  });

  it('clears a stale session once when shared refresh recovery fails', async () => {
    localStorage.setItem('lms_jwt_token', 'stale-access-token');
    let refreshCalls = 0;
    const invalidated = vi.fn();
    window.addEventListener(SESSION_INVALIDATED_EVENT, invalidated);

    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      if (String(input) === '/api/auth/refresh') {
        refreshCalls += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 5));
      }
      return new Response(null, { status: 401 });
    });

    await Promise.all([
      apiFetch('/api/db/state', { feedback: false }),
      apiFetch('/api/db/notifications/user-stu-1', { feedback: false }),
    ]);

    window.removeEventListener(SESSION_INVALIDATED_EVENT, invalidated);
    expect(refreshCalls).toBe(1);
    expect(invalidated).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lms_jwt_token')).toBeNull();
  });

  it('never sends a stale bearer token to public authentication endpoints', async () => {
    localStorage.setItem('lms_jwt_token', 'stale-access-token');
    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    fetchSpy.mockClear();

    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-stu-1' }),
      feedback: false,
    });

    const requestOptions = fetchSpy.mock.calls.at(-1)?.[1];
    expect(new Headers(requestOptions?.headers).has('Authorization')).toBe(false);
  });
});
