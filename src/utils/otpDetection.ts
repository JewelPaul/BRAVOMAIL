// Real OTP & Verification Code Detection Engine

export interface DetectedOTP {
  code: string;
  type: 'numeric' | 'alphanumeric' | 'formatted';
  confidence: 'high' | 'medium';
  contextSnippet?: string;
}

// Strong contextual keywords associated with OTPs
const STRONG_CONTEXT = [
  'verification code',
  'security code',
  'confirmation code',
  'authorization code',
  'login code',
  'auth code',
  'access code',
  'passcode',
  'one-time code',
  'one time code',
  'one-time password',
  'otp',
  'pin code',
  'activation code',
  'verify your',
  'use this code',
  'enter the code',
  'your code is',
];

const GENERAL_CONTEXT = [
  'verify',
  'code',
  'authenticate',
  'expires',
  'valid for',
  'minutes',
  'security',
  'login',
  'signin',
  'sign-in',
  'temporary',
];

// Patterns and dictionary words that look like false positives
const COMMON_DICTIONARY_WORDS = new Set([
  'CODE', 'USER', 'PASS', 'PIN', 'MAIL', 'POST', 'HTTP', 'HTML', 'VIEW', 'OPEN',
  'TEAM', 'TIME', 'DATE', 'INFO', 'LINK', 'SITE', 'NAME', 'FROM', 'WITH', 'YOUR',
  'THIS', 'THAT', 'HERE', 'HAVE', 'SEND', 'SENT', 'HELP', 'SIGN', 'VERIFY', 'SECURE',
]);

const FALSE_POSITIVE_PATTERNS = [
  /^(19\d{2}|20\d{2})$/, // Years from 1900-2099
  /^(0000|1111|2222|3333|4444|5555|6666|7777|8888|9999|1234|000000|111111|123456)$/,
];

/**
 * Extracts plain text cleanly from HTML
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a candidate code is a false positive
 */
function isFalsePositive(code: string, fullText: string, index: number): boolean {
  const upper = code.toUpperCase();
  if (COMMON_DICTIONARY_WORDS.has(upper)) {
    return true;
  }

  // Check common false patterns
  if (FALSE_POSITIVE_PATTERNS.some((p) => p.test(code))) {
    // If it's a 4-digit year like 2026, verify if it's part of a date
    const before5 = fullText.slice(Math.max(0, index - 5), index);
    const after5 = fullText.slice(index + code.length, index + code.length + 5);
    if (/[-/.,]\s*$/.test(before5) || /^\s*[-/.,]/.test(after5)) {
      return true;
    }
    // Pure 4-digit years without explicit "code:" in prefix are rejected
    if (/^(19\d{2}|20\d{2})$/.test(code)) {
      const prefix = fullText.slice(Math.max(0, index - 30), index).toLowerCase();
      if (!prefix.includes('code') && !prefix.includes('otp') && !prefix.includes('pin')) {
        return true;
      }
    }
  }

  // Preceding or trailing character check (avoid being part of a larger number, currency, or dimension)
  const prevChar = fullText[index - 1] || ' ';
  const nextChar = fullText[index + code.length] || ' ';

  // Currency prefixes ($1234, €1234, £1234, ₹1234)
  if (/[$€£¥₹]/.test(prevChar)) return true;

  // Measurement or percentage suffixes (100px, 50%, 10em)
  if (/[%pxremkMB]/i.test(nextChar)) return true;

  // Phone number or URL fragments
  if (prevChar === '+' || prevChar === '/' || nextChar === '/') return true;

  // Order or tracking numbers (e.g. Order #123456)
  const prefix60 = fullText.slice(Math.max(0, index - 40), index).toLowerCase();
  if (prefix60.includes('order #') || prefix60.includes('invoice #') || prefix60.includes('tracking')) {
    return true;
  }

  return false;
}

/**
 * Detects legitimate OTPs and verification codes from email text or HTML
 */
export function detectOTPs(content: string): DetectedOTP[] {
  if (!content) return [];

  // Always work with clean text
  const text = content.includes('<') ? extractTextFromHtml(content) : content;
  const lowerText = text.toLowerCase();
  const results: DetectedOTP[] = [];
  const seenCodes = new Set<string>();

  // 1. HIGH-CONFIDENCE DIRECT PREFIX MATCHES
  // Examples: "verification code is: 849201", "PIN code is: 4819", "Security code: AB49ZK"
  const directPrefixRegex = /(?:verification\s+code|security\s+(?:pin\s+)?code|confirmation\s+code|login\s+code|auth\s+code|passcode|one-time\s+code|one-time\s+password|otp|pin(?:\s+code)?)\s*(?:is|:|-|=)?\s*["']?([A-Z0-9]{4,8})["']?\b/gi;

  let directMatch: RegExpExecArray | null;
  while ((directMatch = directPrefixRegex.exec(text)) !== null) {
    const rawCode = directMatch[1].trim();
    if (rawCode && !isFalsePositive(rawCode, text, directMatch.index) && !seenCodes.has(rawCode.toUpperCase())) {
      const type: DetectedOTP['type'] = /^\d+$/.test(rawCode) ? 'numeric' : 'alphanumeric';
      const snippetStart = Math.max(0, directMatch.index - 20);
      const snippetEnd = Math.min(text.length, directMatch.index + directMatch[0].length + 20);

      results.push({
        code: rawCode,
        type,
        confidence: 'high',
        contextSnippet: text.slice(snippetStart, snippetEnd).trim(),
      });
      seenCodes.add(rawCode.toUpperCase());
    }
  }

  // 2. FORMATTED PREFIXED CODES (e.g., G-123456, 123-456, 123 456)
  const formattedRegex = /\b(?:G-)?(\d{3}[-\s]\d{3})\b/g;
  let formattedMatch: RegExpExecArray | null;
  while ((formattedMatch = formattedRegex.exec(text)) !== null) {
    const rawCode = formattedMatch[0].trim();
    const cleanCode = rawCode.replace(/[-\s]/g, '');

    // Check surrounding context for verification words
    const idx = formattedMatch.index;
    const windowStart = Math.max(0, idx - 60);
    const windowEnd = Math.min(text.length, idx + rawCode.length + 60);
    const windowText = lowerText.slice(windowStart, windowEnd);

    const hasContext = STRONG_CONTEXT.some((k) => windowText.includes(k)) ||
      GENERAL_CONTEXT.some((k) => windowText.includes(k));

    if (hasContext && !seenCodes.has(rawCode.toUpperCase()) && !seenCodes.has(cleanCode)) {
      results.push({
        code: rawCode,
        type: 'formatted',
        confidence: 'high',
        contextSnippet: text.slice(windowStart, windowEnd).trim(),
      });
      seenCodes.add(rawCode.toUpperCase());
    }
  }

  // 3. CONTEXTUAL NUMERIC AND ALPHANUMERIC CODES (4, 6, 8 digits or 5-8 char alphanumeric)
  // Only search if the text contains some verification keywords
  const hasGlobalContext = STRONG_CONTEXT.some((k) => lowerText.includes(k)) ||
    GENERAL_CONTEXT.some((k) => lowerText.includes(k));

  if (hasGlobalContext) {
    // 6-digit numeric (most common OTP standard worldwide)
    const sixDigitRegex = /\b(\d{6})\b/g;
    let sixMatch: RegExpExecArray | null;
    while ((sixMatch = sixDigitRegex.exec(text)) !== null) {
      const code = sixMatch[1];
      const idx = sixMatch.index;

      if (!seenCodes.has(code) && !isFalsePositive(code, text, idx)) {
        const windowStart = Math.max(0, idx - 70);
        const windowEnd = Math.min(text.length, idx + code.length + 70);
        const windowText = lowerText.slice(windowStart, windowEnd);

        const isStrong = STRONG_CONTEXT.some((k) => windowText.includes(k));
        const isGeneral = GENERAL_CONTEXT.some((k) => windowText.includes(k));

        if (isStrong || isGeneral) {
          results.push({
            code,
            type: 'numeric',
            confidence: isStrong ? 'high' : 'medium',
            contextSnippet: text.slice(windowStart, windowEnd).trim(),
          });
          seenCodes.add(code);
        }
      }
    }

    // 4-digit and 8-digit numeric codes
    const otherDigitRegex = /\b(\d{4}|\d{8})\b/g;
    let otherMatch: RegExpExecArray | null;
    while ((otherMatch = otherDigitRegex.exec(text)) !== null) {
      const code = otherMatch[1];
      const idx = otherMatch.index;

      if (!seenCodes.has(code) && !isFalsePositive(code, text, idx)) {
        const windowStart = Math.max(0, idx - 50);
        const windowEnd = Math.min(text.length, idx + code.length + 50);
        const windowText = lowerText.slice(windowStart, windowEnd);

        const isStrong = STRONG_CONTEXT.some((k) => windowText.includes(k));
        if (isStrong) {
          results.push({
            code,
            type: 'numeric',
            confidence: 'medium',
            contextSnippet: text.slice(windowStart, windowEnd).trim(),
          });
          seenCodes.add(code);
        }
      }
    }

    // Alphanumeric mixed codes (e.g., 6 to 8 uppercase letters and digits, must contain at least one letter and one number)
    const alphaNumRegex = /\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{5,8}\b/g;
    let alphaMatch: RegExpExecArray | null;
    while ((alphaMatch = alphaNumRegex.exec(text)) !== null) {
      const code = alphaMatch[0];
      const idx = alphaMatch.index;

      if (!seenCodes.has(code.toUpperCase()) && !isFalsePositive(code, text, idx)) {
        const windowStart = Math.max(0, idx - 60);
        const windowEnd = Math.min(text.length, idx + code.length + 60);
        const windowText = lowerText.slice(windowStart, windowEnd);

        const isStrong = STRONG_CONTEXT.some((k) => windowText.includes(k));
        if (isStrong) {
          results.push({
            code,
            type: 'alphanumeric',
            confidence: 'high',
            contextSnippet: text.slice(windowStart, windowEnd).trim(),
          });
          seenCodes.add(code.toUpperCase());
        }
      }
    }
  }

  // Sort results by confidence (high before medium)
  return results.sort((a, b) => {
    if (a.confidence === 'high' && b.confidence !== 'high') return -1;
    if (b.confidence === 'high' && a.confidence !== 'high') return 1;
    return 0;
  });
}
