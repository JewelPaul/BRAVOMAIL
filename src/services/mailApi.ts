const API_BASE = "https://api.mail.tm";
const CORS_PROXY = "https://corsproxy.io/?url=";

const getTimeoutSignal = (milliseconds: number): AbortSignal => {
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), milliseconds);
  return controller.signal;
};

export interface Domain {
  id: string;
  domain: string;
  isActive: boolean;
}

export interface EmailAccount {
  id: string;
  address: string;
  password: string;
  token: string;
}

export interface EmailMessage {
  id: string;
  from: { name: string; address: string };
  subject: string;
  intro: string;
  seen: boolean;
  createdAt: string;
  size: number;
}

export interface EmailContent extends EmailMessage {
  html: string[];
  text: string;
}

class MailApi {
  private currentAccount: EmailAccount | null = null;
  private authToken: string | null = null;
  private useProxy = false;

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout = 10000,
  ): Promise<T> {
    const apiUrl = `${API_BASE}${endpoint}`;
    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(this.authToken ? { Authorization: ["Bearer", this.authToken].join(" ") } : {}),
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      signal: getTimeoutSignal(timeout),
    };

    let response: Response;
    try {
      response = await fetch(
        this.useProxy ? `${CORS_PROXY}${encodeURIComponent(apiUrl)}` : apiUrl,
        fetchOptions,
      );
    } catch (error) {
      if (this.useProxy || !(error instanceof TypeError)) {
        throw new Error("Unable to reach the email service. Check your connection and try again.");
      }

      this.useProxy = true;
      try {
        response = await fetch(`${CORS_PROXY}${encodeURIComponent(apiUrl)}`, {
          ...fetchOptions,
          signal: getTimeoutSignal(timeout),
        });
      } catch {
        throw new Error("Unable to reach the email service. Check your connection and try again.");
      }
    }

    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json() as { message?: string; detail?: string };
        detail = body.detail || body.message || detail;
      } catch {
        // Keep the HTTP status when the service does not return JSON.
      }
      throw new Error(`Email service error: ${detail}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  async initializeConnection(): Promise<void> {
    await this.getDomains();
  }

  getApiMode(): "real" {
    return "real";
  }

  async checkApiHealth(): Promise<boolean> {
    try {
      await this.getDomains();
      return true;
    } catch (error) {
      console.error("Email service health check failed:", error);
      return false;
    }
  }

  async getDomains(): Promise<Domain[]> {
    const data = await this.request<{ "hydra:member"?: Domain[] }>("/domains");
    const domains = (data["hydra:member"] || []).filter((domain) => domain.isActive);
    if (domains.length === 0) {
      throw new Error("The email service returned no active domains.");
    }
    return domains;
  }

  async createAccount(): Promise<EmailAccount> {
    const domains = await this.getDomains();
    const domain = domains[Math.floor(Math.random() * domains.length)]?.domain;
    if (!domain) {
      throw new Error("No active email domains are available.");
    }

    const username = `user${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const address = `${username}@${domain}`;
    const account = await this.request<{ id: string; address: string }>("/accounts", {
      method: "POST",
      body: JSON.stringify({ address, password }),
    }, 15000);
    const tokenData = await this.request<{ token: string }>("/token", {
      method: "POST",
      body: JSON.stringify({ address, password }),
    });

    this.authToken = tokenData.token;
    this.currentAccount = {
      id: account.id,
      address: account.address,
      password,
      token: tokenData.token,
    };
    return this.currentAccount;
  }

  async getMessages(): Promise<EmailMessage[]> {
    if (!this.authToken) {
      throw new Error("Create a temporary email address before checking the inbox.");
    }
    const data = await this.request<{ "hydra:member"?: EmailMessage[] }>("/messages");
    return data["hydra:member"] || [];
  }

  async getMessage(id: string): Promise<EmailContent> {
    if (!this.authToken) {
      throw new Error("Create a temporary email address before opening a message.");
    }
    return this.request<EmailContent>(`/messages/${encodeURIComponent(id)}`);
  }

  async deleteAccount(): Promise<void> {
    if (!this.currentAccount || !this.authToken) return;
    try {
      await this.request<void>(`/accounts/${encodeURIComponent(this.currentAccount.id)}`, {
        method: "DELETE",
      }, 8000);
    } finally {
      this.currentAccount = null;
      this.authToken = null;
    }
  }

  getCurrentAccount(): EmailAccount | null {
    return this.currentAccount;
  }

  getConnectionInfo(): { mode: "real"; corsProxy: boolean; initialized: boolean } {
    return { mode: "real", corsProxy: this.useProxy, initialized: true };
  }
}

export const mailApi = new MailApi();
