import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mailApi, BackendNotConfiguredError } from '@/services/mailApi';

describe('Mail API Client Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mailApi.clearSession();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws BackendNotConfiguredError when VITE_API_BASE_URL is missing', async () => {
    vi.spyOn(mailApi, 'getApiBaseUrl').mockReturnValue('');
    expect(mailApi.isConfigured()).toBe(false);

    await expect(mailApi.createAccount()).rejects.toThrow(BackendNotConfiguredError);
    await expect(mailApi.getMessages()).rejects.toThrow();
  });

  it('handles account generation with genuine backend response', async () => {
    vi.spyOn(mailApi, 'getApiBaseUrl').mockReturnValue('http://localhost:3001');

    const fakeBackendResponse = {
      id: 'acc_test123',
      address: 'bm_user@fldubai.com',
      token: 'iv.ciphertext.tag',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => fakeBackendResponse,
    } as Response);

    const account = await mailApi.createAccount();
    expect(account.address).toBe('bm_user@fldubai.com');
    expect(account.token).toBe('iv.ciphertext.tag');
    expect(mailApi.getCurrentAccount()?.address).toBe('bm_user@fldubai.com');
  });

  it('handles provider API failure gracefully and maps error message', async () => {
    vi.spyOn(mailApi, 'getApiBaseUrl').mockReturnValue('http://localhost:3001');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ error: 'Upstream mail provider temporarily unavailable.', code: 'PROVIDER_ERROR' }),
    } as Response);

    await expect(mailApi.createAccount()).rejects.toThrow('Upstream mail provider temporarily unavailable.');
  });

  it('handles authentication expiration (401) and clears expired session', async () => {
    vi.spyOn(mailApi, 'getApiBaseUrl').mockReturnValue('http://localhost:3001');

    // Seed active session in sessionStorage and restore
    window.sessionStorage.setItem(
      'bravomail_session_account',
      JSON.stringify({
        id: 'acc_1',
        address: 'test@fldubai.com',
        token: 'expired_token',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      })
    );
    // Trigger session restore
    mailApi['restoreSession']();
    expect(mailApi.getCurrentAccount()?.address).toBe('test@fldubai.com');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Session has expired.', code: 'SESSION_EXPIRED' }),
    } as Response);

    await expect(mailApi.getMessages()).rejects.toThrow('Temporary email session has expired');
    expect(mailApi.getCurrentAccount()).toBeNull();
  });

  it('retrieves inbox messages for the active session', async () => {
    vi.spyOn(mailApi, 'getApiBaseUrl').mockReturnValue('http://localhost:3001');
    vi.spyOn(mailApi, 'getCurrentAccount').mockReturnValue({
      id: 'acc_1',
      address: 'active@fldubai.com',
      token: 'valid_token',
      expiresAt: new Date(Date.now() + 100000).toISOString(),
    });

    const mockMessages = [
      {
        id: 'msg_1',
        from: { name: 'Support', address: 'support@example.com' },
        subject: 'Welcome to BravoMail',
        intro: 'Here is your verification code 123456',
        seen: false,
        createdAt: new Date().toISOString(),
        size: 1024,
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: mockMessages }),
    } as Response);

    const messages = await mailApi.getMessages();
    expect(messages.length).toBe(1);
    expect(messages[0].subject).toBe('Welcome to BravoMail');
  });

  it('handles empty inbox gracefully without error', async () => {
    vi.spyOn(mailApi, 'getApiBaseUrl').mockReturnValue('http://localhost:3001');
    vi.spyOn(mailApi, 'getCurrentAccount').mockReturnValue({
      id: 'acc_1',
      address: 'active@fldubai.com',
      token: 'valid_token',
      expiresAt: new Date(Date.now() + 100000).toISOString(),
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [] }),
    } as Response);

    const messages = await mailApi.getMessages();
    expect(messages).toEqual([]);
  });

  it('fetches message details correctly', async () => {
    vi.spyOn(mailApi, 'getApiBaseUrl').mockReturnValue('http://localhost:3001');
    vi.spyOn(mailApi, 'getCurrentAccount').mockReturnValue({
      id: 'acc_1',
      address: 'active@fldubai.com',
      token: 'valid_token',
      expiresAt: new Date(Date.now() + 100000).toISOString(),
    });

    const mockDetail = {
      id: 'msg_detail_1',
      from: { name: 'Security', address: 'security@example.com' },
      subject: 'Your One-Time Password',
      intro: 'Code: 981240',
      text: 'Your one-time code is 981240',
      html: '<p>Your one-time code is <b>981240</b></p>',
      seen: true,
      createdAt: new Date().toISOString(),
      size: 2048,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockDetail,
    } as Response);

    const detail = await mailApi.getMessage('msg_detail_1');
    expect(detail.id).toBe('msg_detail_1');
    expect(detail.text).toContain('981240');
  });

  it('treats locally expired session as null', () => {
    const expiredPastAccount = {
      id: 'acc_past',
      address: 'old@fldubai.com',
      token: 'old_token',
      expiresAt: new Date(Date.now() - 5000).toISOString(), // Expired 5 seconds ago
    };

    // Save to session
    window.sessionStorage.setItem('bravomail_session_account', JSON.stringify(expiredPastAccount));

    expect(mailApi.getCurrentAccount()).toBeNull();
  });
});
