// BravoMail Client API Service
// Connects to the secure, dedicated BravoMail backend.
// Zero reliance on public CORS proxies.

export interface EmailAccount {
  id: string;
  address: string;
  token: string;
  expiresAt: string;
}

export interface EmailMessage {
  id: string;
  from: { name: string; address: string };
  to?: { name: string; address: string }[];
  subject: string;
  intro: string;
  seen: boolean;
  createdAt: string;
  size: number;
  hasAttachments?: boolean;
}

export interface EmailContent extends EmailMessage {
  html: string;
  text: string;
}

export class BackendNotConfiguredError extends Error {
  constructor(message = 'Backend API URL is not configured. Please set VITE_API_BASE_URL to your backend URL.') {
    super(message);
    this.name = 'BackendNotConfiguredError';
  }
}

class MailApi {
  private currentAccount: EmailAccount | null = null;
  private readonly storageKey = 'bravomail_session_account';

  constructor() {
    this.restoreSession();
  }

  /**
   * Reads configured API base URL from Vite environment variable.
   */
  getApiBaseUrl(): string {
    const raw = import.meta.env.VITE_API_BASE_URL;
    if (!raw || typeof raw !== 'string') {
      return '';
    }
    return raw.trim().replace(/\/+$/, '');
  }

  /**
   * Returns true if a non-empty backend URL is configured.
   */
  isConfigured(): boolean {
    return Boolean(this.getApiBaseUrl());
  }

  /**
   * Restores active account from sessionStorage if still unexpired.
   */
  private restoreSession(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    try {
      const saved = window.sessionStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as EmailAccount;
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          this.currentAccount = parsed;
        } else {
          this.clearSession();
        }
      }
    } catch {
      this.clearSession();
    }
  }

  private saveSession(account: EmailAccount | null): void {
    this.currentAccount = account;
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    try {
      if (account) {
        window.sessionStorage.setItem(this.storageKey, JSON.stringify(account));
      } else {
        window.sessionStorage.removeItem(this.storageKey);
      }
    } catch {
      // Ignore sessionStorage errors (e.g. storage disabled)
    }
  }

  clearSession(): void {
    this.currentAccount = null;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(this.storageKey);
    }
  }

  getCurrentAccount(): EmailAccount | null {
    if (this.currentAccount?.expiresAt && new Date(this.currentAccount.expiresAt).getTime() <= Date.now()) {
      this.clearSession();
      return null;
    }
    return this.currentAccount;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = this.getApiBaseUrl();
    if (!baseUrl) {
      throw new BackendNotConfiguredError();
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(this.currentAccount?.token ? { Authorization: `Bearer ${this.currentAccount.token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (response.status === 204) {
        return undefined as T;
      }

      if (!response.ok) {
        let errorDetail = `${response.status} ${response.statusText}`;
        try {
          const body = (await response.json()) as { error?: string; message?: string };
          errorDetail = body.error || body.message || errorDetail;
        } catch {
          // Keep response status
        }

        if (response.status === 401) {
          this.clearSession();
          throw new Error('Temporary email session has expired. Please generate a new address.');
        }

        throw new Error(errorDetail);
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof BackendNotConfiguredError) {
        throw err;
      }
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Request to email backend timed out. Please try again.');
        }
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          throw new Error('Unable to reach BravoMail backend. Check your network or verify the backend service is running.');
        }
        throw err;
      }
      throw new Error('An unexpected error occurred while communicating with the email service.');
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Health check for the backend and provider
   */
  async checkApiHealth(): Promise<{ healthy: boolean; message: string }> {
    if (!this.isConfigured()) {
      return {
        healthy: false,
        message: 'Backend API URL is not configured. Set VITE_API_BASE_URL to connect to your BravoMail server.',
      };
    }

    try {
      const res = await this.request<{ status: string; providerHealthy: boolean }>('/health');
      return {
        healthy: res.status === 'ok' && Boolean(res.providerHealthy),
        message: res.status === 'ok' ? 'Email service connected and ready.' : 'Email service reported degraded status.',
      };
    } catch (err) {
      return {
        healthy: false,
        message: err instanceof Error ? err.message : 'Failed to reach email backend.',
      };
    }
  }

  /**
   * Generates a genuine temporary email account through the backend
   */
  async createAccount(): Promise<EmailAccount> {
    const account = await this.request<EmailAccount>('/api/accounts', {
      method: 'POST',
    });

    this.saveSession(account);
    return account;
  }

  /**
   * Retrieves messages for the active session
   */
  async getMessages(): Promise<EmailMessage[]> {
    const account = this.getCurrentAccount();
    if (!account) {
      throw new Error('No active email account. Generate a temporary email to view your inbox.');
    }

    const data = await this.request<{ messages: EmailMessage[] }>('/api/messages');
    return data.messages || [];
  }

  /**
   * Retrieves message content and details
   */
  async getMessage(id: string): Promise<EmailContent> {
    const account = this.getCurrentAccount();
    if (!account) {
      throw new Error('No active email account. Generate a temporary email to view messages.');
    }

    return this.request<EmailContent>(`/api/messages/${encodeURIComponent(id)}`);
  }

  /**
   * Deletes a single message
   */
  async deleteMessage(id: string): Promise<void> {
    await this.request<void>(`/api/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Deletes the active temporary account and invalidates session
   */
  async deleteAccount(): Promise<void> {
    if (!this.currentAccount) return;

    try {
      await this.request<void>('/api/accounts', {
        method: 'DELETE',
      });
    } finally {
      this.clearSession();
    }
  }
}

export const mailApi = new MailApi();
