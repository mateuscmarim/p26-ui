import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApi } from '../js/api.js';

describe('createApi', () => {
  let originalAjax;

  beforeEach(() => {
    localStorage.clear();
    window.settings = { apiBase: '' };
    originalAjax = global.$.ajax;
  });

  afterEach(() => {
    global.$.ajax = originalAjax;
  });

  it('attaches Authorization header when token present', async () => {
    localStorage.setItem('cred_token', 'abc');
    let captured = null;
    global.$.ajax = vi.fn((opts) => {
      captured = opts;
      return Promise.resolve({ ok: true });
    });

    const api = createApi();
    await api.get('/api/credentials/credentials');

    expect(captured.headers.Authorization).toBe('Bearer abc');
    expect(captured.url).toBe('/api/credentials/credentials');
  });

  it('omits Authorization header when no token', async () => {
    let captured = null;
    global.$.ajax = vi.fn((opts) => { captured = opts; return Promise.resolve({}); });

    await createApi().get('/api/credentials/credentials');

    expect(captured.headers.Authorization).toBeUndefined();
  });

  it('prepends apiBase to all URLs', async () => {
    window.settings.apiBase = 'https://api.example.com';
    let captured = null;
    global.$.ajax = vi.fn((opts) => { captured = opts; return Promise.resolve({}); });

    await createApi().get('/api/credentials/foo');

    expect(captured.url).toBe('https://api.example.com/api/credentials/foo');
  });

  it('serializes query params on GET', async () => {
    let captured = null;
    global.$.ajax = vi.fn((opts) => { captured = opts; return Promise.resolve({}); });

    await createApi().get('/api/credentials/credentials', { status: 'EXPIRING_SOON', location_id: 5 });

    expect(captured.url).toBe('/api/credentials/credentials?status=EXPIRING_SOON&location_id=5');
  });

  it('fires auth:expired CustomEvent on 401 and clears all auth keys', async () => {
    localStorage.setItem('cred_token', 'abc');
    localStorage.setItem('cred_display_name', 'Alice');
    localStorage.setItem('cred_user_id', '7');
    localStorage.setItem('cred_email', 'a@b.com');
    global.$.ajax = vi.fn(() => Promise.reject({ status: 401 }));
    const handler = vi.fn();
    window.addEventListener('auth:expired', handler);

    await expect(createApi().get('/api/credentials/credentials')).rejects.toThrow('Unauthorized');
    expect(handler).toHaveBeenCalled();
    expect(localStorage.getItem('cred_token')).toBe(null);
    expect(localStorage.getItem('cred_display_name')).toBe(null);
    expect(localStorage.getItem('cred_user_id')).toBe(null);
    expect(localStorage.getItem('cred_email')).toBe(null);

    window.removeEventListener('auth:expired', handler);
  });

  it('rejects with the original jqXHR on non-401 errors so callers can read responseJSON', async () => {
    global.$.ajax = vi.fn(() => Promise.reject({ status: 500, responseJSON: { message: 'boom' } }));
    await expect(createApi().get('/api/credentials/credentials')).rejects.toMatchObject({
      status: 500,
      responseJSON: { message: 'boom' },
    });
  });

  it('login posts {email,password} to /api/auth/login and camelizes the response', async () => {
    let captured = null;
    global.$.ajax = vi.fn((opts) => {
      captured = opts;
      return Promise.resolve({ token: 't', display_name: 'Alice', user_id: 7 });
    });

    const r = await createApi().login({ email: 'a@b.com', password: 'pw' });
    expect(captured.url).toBe('/api/auth/login');
    expect(captured.method).toBe('POST');
    expect(JSON.parse(captured.data)).toEqual({ email: 'a@b.com', password: 'pw' });
    expect(r).toEqual({ token: 't', displayName: 'Alice', userId: 7 });
  });

  it('exposes a namespaced surface: credentials.list calls GET with snakeized query params', async () => {
    let captured = null;
    global.$.ajax = vi.fn((opts) => {
      captured = opts;
      return Promise.resolve({ items: [] });
    });

    await createApi().credentials.list({ status: 'EXPIRING_SOON', locationId: 5, limit: 25 });
    expect(captured.method).toBe('GET');
    expect(captured.url).toBe('/api/credentials/credentials?status=EXPIRING_SOON&location_id=5&limit=25');
  });

  it('credentials.update sends a PUT with a snakeized patch body', async () => {
    let captured = null;
    global.$.ajax = vi.fn((opts) => {
      captured = opts;
      return Promise.resolve({ id: 1 });
    });

    await createApi().credentials.update(1, { notes: 'x', expiresAt: '2026-06-01' });
    expect(captured.method).toBe('PUT');
    expect(captured.url).toBe('/api/credentials/credentials/1');
    expect(JSON.parse(captured.data)).toEqual({ notes: 'x', expires_at: '2026-06-01' });
  });

  it('reminders.recent passes ?days=7 and camelizes list items', async () => {
    let captured = null;
    global.$.ajax = vi.fn((opts) => {
      captured = opts;
      return Promise.resolve({
        items: [
          { id: 1, recipient_email: 'a@b.com', sent_at: '2026-05-05T10:00:00Z', template_name: 'expiry-30d' },
        ],
      });
    });

    const r = await createApi().reminders.recent(7);
    expect(captured.url).toBe('/api/credentials/reminders/recent?days=7');
    expect(r.items[0]).toEqual({
      id: 1,
      recipientEmail: 'a@b.com',
      sentAt: '2026-05-05T10:00:00Z',
      templateName: 'expiry-30d',
    });
  });
});
