const API_BASE = 'https://api.mail.gw';
// Set to true for development/demo when real API is not accessible
// Set to false for production with real email service
const USE_MOCK = true; 

// CORS proxy for development/testing when direct API access is blocked
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const USE_CORS_PROXY = false; // Enable if needed for CORS issues

export interface Domain {
  id: string;
  domain: string;
  isActive: boolean;
}

export interface EmailAccount {
  id: string;
  address: string;
  password?: string;
  token?: string;
}

export interface EmailMessage {
  id: string;
  from: {
    name: string;
    address: string;
  };
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

// Mock data for demo purposes
const MOCK_DOMAINS: Domain[] = [
  { id: '1', domain: 'bravo-mail.com', isActive: true },
  { id: '2', domain: 'temp-email.net', isActive: true }
];

const MOCK_MESSAGES: EmailMessage[] = [
  {
    id: 'mock_1',
    from: {
      name: 'Security Team',
      address: 'noreply@secureapp.com'
    },
    subject: 'Your Verification Code',
    intro: 'Your verification code is 123456. This code will expire in 10 minutes.',
    seen: false,
    createdAt: new Date().toISOString(),
    size: 1024
  },
  {
    id: 'mock_2', 
    from: {
      name: 'TechCorp',
      address: 'support@techcorp.com'
    },
    subject: 'Login Verification Required',
    intro: 'Your security code: ABC123. Please use this code to complete your login.',
    seen: false,
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    size: 856
  }
];

class MailApi {
  private currentAccount: EmailAccount | null = null;
  private authToken: string | null = null;
  private corsProxyNeeded: boolean = false;

  private getApiUrl(endpoint: string): string {
    const needsProxy = USE_CORS_PROXY || this.corsProxyNeeded;
    const baseUrl = needsProxy ? `${CORS_PROXY}${API_BASE}` : API_BASE;
    return `${baseUrl}${endpoint}`;
  }

  // Retry mechanism for API calls
  private async retryApiCall<T>(operation: () => Promise<T>, maxRetries: number = 2): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          console.log(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Progressive delay
        }
      }
    }
    
    throw lastError;
  }

  // Auto-detect if CORS proxy is needed
  private async testDirectConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/domains`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Initialize connection and detect best API access method
  async initializeConnection(): Promise<void> {
    if (USE_MOCK) return;
    
    console.log('Testing API connection...');
    
    // First try direct connection
    const directWorks = await this.testDirectConnection();
    
    if (directWorks) {
      this.corsProxyNeeded = false;
      console.log('✓ Direct API access working');
      return;
    }
    
    console.log('⚠ Direct API access failed, trying CORS proxy...');
    
    // Try with CORS proxy
    this.corsProxyNeeded = true;
    try {
      const response = await fetch(this.getApiUrl('/domains'), { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        console.log('✓ CORS proxy working');
      } else {
        console.log('⚠ CORS proxy available but API returned error');
      }
    } catch {
      console.log('⚠ CORS proxy also failed, API may be completely unavailable');
      // Keep corsProxyNeeded = true as fallback, but expect failures
    }
  }

  // Get current API mode for UI display
  getApiMode(): 'mock' | 'real' {
    return USE_MOCK ? 'mock' : 'real';
  }

  // Check if real API is available
  async checkApiHealth(): Promise<boolean> {
    if (USE_MOCK) return true;
    
    // Initialize connection method if not done yet
    if (!USE_CORS_PROXY && !this.corsProxyNeeded) {
      await this.initializeConnection();
    }
    
    try {
      const response = await fetch(this.getApiUrl('/domains'), { 
        method: 'HEAD',
        signal: AbortSignal.timeout(8000) // 8 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Mock API methods for demo purposes
  private async mockDelay(ms: number = 800): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async mockGetDomains(): Promise<Domain[]> {
    await this.mockDelay(500);
    return MOCK_DOMAINS;
  }

  private async mockCreateAccount(): Promise<EmailAccount> {
    await this.mockDelay(1000);
    
    const username = Math.random().toString(36).substring(2, 10);
    const domain = MOCK_DOMAINS[0].domain;
    const address = `${username}@${domain}`;
    const password = Math.random().toString(36).substring(2, 15);
    const token = 'mock_token_' + Math.random().toString(36).substring(2, 15);
    
    const account: EmailAccount = {
      id: Math.random().toString(36).substring(2, 15),
      address,
      password,
      token
    };
    
    this.currentAccount = account;
    this.authToken = token;
    
    return account;
  }

  private async mockGetMessages(): Promise<EmailMessage[]> {
    await this.mockDelay(600);
    // Return the mock messages for demo
    return MOCK_MESSAGES;
  }

  private async mockGetMessage(id: string): Promise<EmailContent> {
    await this.mockDelay(400);
    const message = MOCK_MESSAGES.find(m => m.id === id);
    if (!message) throw new Error('Message not found');
    
    // Create enhanced content with OTP codes
    let htmlContent = '';
    let textContent = '';
    
    if (id === 'mock_1') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Your Verification Code</h2>
          <p>Hi there,</p>
          <p>You've requested a verification code for your account. Please use the code below to complete your verification:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 16px; color: #6b7280;">Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 10px 0; letter-spacing: 4px;">123456</div>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">This code will expire in 10 minutes</p>
          </div>
          <p>If you didn't request this code, please ignore this email.</p>
          <p>Best regards,<br>Security Team</p>
        </div>
      `;
      textContent = `Your Verification Code

Hi there,

You've requested a verification code for your account. Please use the code below to complete your verification:

Your verification code is: 123456

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Security Team`;
    } else if (id === 'mock_2') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">Login Verification Required</h2>
          <p>Hello,</p>
          <p>We detected a login attempt to your TechCorp account. For your security, please verify this login using the code below:</p>
          <div style="background: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 16px; color: #065f46;">Security Code:</p>
            <div style="font-size: 28px; font-weight: bold; color: #065f46; margin: 10px 0; letter-spacing: 2px;">ABC123</div>
            <p style="margin: 0; font-size: 14px; color: #065f46;">Valid for 15 minutes</p>
          </div>
          <p>If this wasn't you, please contact our support team immediately.</p>
          <p>Thank you,<br>TechCorp Support Team</p>
        </div>
      `;
      textContent = `Login Verification Required

Hello,

We detected a login attempt to your TechCorp account. For your security, please verify this login using the code below:

Security Code: ABC123

Valid for 15 minutes.

If this wasn't you, please contact our support team immediately.

Thank you,
TechCorp Support Team`;
    }
    
    return {
      ...message,
      html: [htmlContent],
      text: textContent
    };
  }

  private async mockDeleteAccount(): Promise<void> {
    await this.mockDelay(300);
    this.currentAccount = null;
    this.authToken = null;
  }

  // Get available domains
  async getDomains(): Promise<Domain[]> {
    if (USE_MOCK) {
      return this.mockGetDomains();
    }

    // Initialize connection method if not done yet
    if (!USE_CORS_PROXY && !this.corsProxyNeeded) {
      await this.initializeConnection();
    }

    try {
      return await this.retryApiCall(async () => {
        const response = await fetch(this.getApiUrl('/domains'), {
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data['hydra:member'] || [];
      });
    } catch (error) {
      console.error('Error fetching domains:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to the email service. This may be due to network connectivity issues or CORS restrictions in your browser.');
      } else if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Connection to email service timed out. Please check your internet connection and try again.');
      } else {
        throw new Error(`Email service error: ${error instanceof Error ? error.message : 'Unknown network error'}`);
      }
    }
  }

  // Create a new email account
  async createAccount(): Promise<EmailAccount> {
    if (USE_MOCK) {
      return this.mockCreateAccount();
    }

    try {
      // Get available domains first
      const domains = await this.getDomains();
      if (domains.length === 0) {
        throw new Error('No email domains available from the service');
      }

      // Generate random username
      const username = Math.random().toString(36).substring(2, 10);
      const domain = domains[0].domain;
      const address = `${username}@${domain}`;
      const password = Math.random().toString(36).substring(2, 15);

      // Create account with retry
      const account = await this.retryApiCall(async () => {
        const response = await fetch(this.getApiUrl('/accounts'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address,
            password,
          }),
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!response.ok) {
          throw new Error(`Failed to create email account: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      });
      
      // Get authentication token with retry
      const tokenData = await this.retryApiCall(async () => {
        const tokenResponse = await fetch(this.getApiUrl('/token'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address,
            password,
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to authenticate: ${tokenResponse.status} ${tokenResponse.statusText}`);
        }
        
        return await tokenResponse.json();
      });
      
      this.currentAccount = {
        id: account.id,
        address: account.address,
        password,
        token: tokenData.token,
      };
      
      this.authToken = tokenData.token;
      
      return this.currentAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unable to create temporary email. The email service may be temporarily unavailable.');
    }
  }

  // Get messages for current account
  async getMessages(): Promise<EmailMessage[]> {
    if (!this.authToken) throw new Error('No authenticated account');

    if (USE_MOCK) {
      return this.mockGetMessages();
    }

    try {
      const response = await fetch(this.getApiUrl('/messages'), {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data['hydra:member'] || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unable to fetch emails. The email service may be temporarily unavailable.');
    }
  }

  // Get full message content
  async getMessage(id: string): Promise<EmailContent> {
    if (!this.authToken) throw new Error('No authenticated account');

    if (USE_MOCK) {
      return this.mockGetMessage(id);
    }

    try {
      const response = await fetch(this.getApiUrl(`/messages/${id}`), {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch message: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching message:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unable to load email content. The email service may be temporarily unavailable.');
    }
  }

  // Delete current account
  async deleteAccount(): Promise<void> {
    if (!this.currentAccount || !this.authToken) return;

    if (USE_MOCK) {
      return this.mockDeleteAccount();
    }

    try {
      await fetch(this.getApiUrl(`/accounts/${this.currentAccount.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
        signal: AbortSignal.timeout(8000) // 8 second timeout
      });
      
      this.currentAccount = null;
      this.authToken = null;
    } catch (error) {
      console.error('Error deleting account:', error);
      // Still clear local state even if API call fails
      this.currentAccount = null;
      this.authToken = null;
    }
  }

  getCurrentAccount(): EmailAccount | null {
    return this.currentAccount;
  }

  // Get connection status for debugging/UI purposes  
  getConnectionInfo(): { mode: 'mock' | 'real', corsProxy: boolean, initialized: boolean } {
    return {
      mode: USE_MOCK ? 'mock' : 'real',
      corsProxy: this.corsProxyNeeded || USE_CORS_PROXY,
      initialized: USE_MOCK || this.corsProxyNeeded !== undefined
    };
  }
}

export const mailApi = new MailApi();