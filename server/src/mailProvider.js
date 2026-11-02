const MAIL_TM_BASE = process.env.MAILTM_API_BASE || 'https://api.mail.tm';
const REQUEST_TIMEOUT_MS = 12000;

class MailProviderError extends Error {
  constructor(message, status = 500, code = 'PROVIDER_ERROR') {
    super(message);
    this.name = 'MailProviderError';
    this.status = status;
    this.code = code;
  }
}

async function requestMailTm(endpoint, options = {}, token = null) {
  const url = `${MAIL_TM_BASE}${endpoint}`;
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        detail = body.detail || body.message || detail;
      } catch {
        // use fallback detail
      }

      if (response.status === 401) {
        throw new MailProviderError('Provider authentication expired or invalid.', 401, 'AUTH_FAILED');
      }
      if (response.status === 429) {
        throw new MailProviderError('Upstream mail provider rate limit reached. Please wait a moment.', 429, 'UPSTREAM_RATE_LIMIT');
      }
      if (response.status === 404) {
        throw new MailProviderError('Requested resource not found.', 404, 'NOT_FOUND');
      }

      throw new MailProviderError(`Mail provider error: ${detail}`, response.status, 'PROVIDER_API_ERROR');
    }

    return await response.json();
  } catch (err) {
    if (err instanceof MailProviderError) {
      throw err;
    }
    if (err.name === 'AbortError') {
      throw new MailProviderError('Mail provider request timed out.', 504, 'TIMEOUT');
    }
    throw new MailProviderError(`Failed to reach mail provider: ${err.message}`, 502, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retrieves available domains from Mail.tm
 */
export async function getActiveDomains() {
  const data = await requestMailTm('/domains');
  const list = Array.isArray(data) ? data : (data['hydra:member'] || []);
  const domains = list.filter((d) => d.isActive);
  if (!domains.length) {
    throw new MailProviderError('No active email domains currently available.', 503, 'NO_DOMAINS');
  }
  return domains.map((d) => d.domain);
}

/**
 * Creates an account on Mail.tm and retrieves authentication token
 */
export async function createTemporaryAccount() {
  const domains = await getActiveDomains();
  const domain = domains[Math.floor(Math.random() * domains.length)];

  // Random username and strong 32-char password
  const randomSuffix = Math.random().toString(36).substring(2, 12);
  const username = `bm_${Date.now().toString(36)}_${randomSuffix}`;
  const address = `${username}@${domain}`;
  const password = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}!Secure`;

  // 1. Register account
  const account = await requestMailTm('/accounts', {
    method: 'POST',
    body: JSON.stringify({ address, password }),
  });

  // 2. Fetch token
  const tokenData = await requestMailTm('/token', {
    method: 'POST',
    body: JSON.stringify({ address, password }),
  });

  return {
    id: account.id,
    address: account.address,
    providerToken: tokenData.token,
  };
}

/**
 * Fetches messages for an account using its provider token
 */
export async function getMessages(providerToken) {
  const data = await requestMailTm('/messages', {}, providerToken);
  const rawMessages = Array.isArray(data) ? data : (data['hydra:member'] || []);

  return rawMessages.map((m) => ({
    id: m.id,
    from: m.from || { address: 'unknown', name: '' },
    to: m.to || [],
    subject: m.subject || '(No subject)',
    intro: m.intro || '',
    seen: Boolean(m.seen),
    createdAt: m.createdAt,
    size: m.size || 0,
    hasAttachments: Boolean(m.hasAttachments),
  }));
}

/**
 * Fetches details and content of a single message
 */
export async function getMessageDetails(id, providerToken) {
  const m = await requestMailTm(`/messages/${encodeURIComponent(id)}`, {}, providerToken);
  return {
    id: m.id,
    from: m.from || { address: 'unknown', name: '' },
    to: m.to || [],
    subject: m.subject || '(No subject)',
    intro: m.intro || '',
    seen: Boolean(m.seen),
    createdAt: m.createdAt,
    size: m.size || 0,
    text: m.text || '',
    html: Array.isArray(m.html) ? m.html.join('') : (m.html || ''),
    attachments: m.attachments || [],
  };
}

/**
 * Deletes a single message
 */
export async function deleteMessage(id, providerToken) {
  await requestMailTm(`/messages/${encodeURIComponent(id)}`, { method: 'DELETE' }, providerToken);
}

/**
 * Deletes an account from Mail.tm
 */
export async function deleteAccount(id, providerToken) {
  await requestMailTm(`/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }, providerToken);
}

/**
 * Checks provider health
 */
export async function checkProviderHealth() {
  try {
    const domains = await getActiveDomains();
    return { healthy: true, domainsAvailable: domains.length };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}
