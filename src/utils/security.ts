/**
 * Client-side security utilities
 */

/**
 * Strips sensitive authentication tokens or credentials from error messages
 * before displaying them in the user interface.
 */
export const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    let message = error.message;

    // Redact Bearer tokens or long hex/base64 strings
    message = message.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
    message = message.replace(/[A-Za-z0-9+/=_-]{40,}/g, '[CREDENTIAL_REDACTED]');

    // Redact internal server paths
    message = message.replace(/(?:\/[a-zA-Z0-9._-]+){3,}/g, '[PATH_REDACTED]');

    return message;
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Initializes harmless client-side security policies (e.g. noreferrer on dynamic window.open)
 */
export const initializeSecurityProtections = () => {
  // Safe window opener protection
  if (typeof window !== 'undefined' && window.open) {
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const safeFeatures = features
        ? `${features},noopener,noreferrer`
        : 'noopener,noreferrer';
      return originalOpen.call(window, url, target, safeFeatures);
    };
  }
};
