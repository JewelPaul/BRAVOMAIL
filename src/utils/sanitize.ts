import DOMPurify from 'dompurify';

// Hook to configure safe links and image security
let hookConfigured = false;

function ensurePurifyHooks() {
  if (hookConfigured || typeof window === 'undefined') return;

  // Transform links: open in new tab with secure rel
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');

      // Reject non-http(s)/mailto protocols
      const href = node.getAttribute('href');
      if (href && !/^(https?:|mailto:|\/|#)/i.test(href.trim())) {
        node.removeAttribute('href');
      }
    }

    if (node.tagName === 'IMG') {
      node.setAttribute('loading', 'lazy');
      node.setAttribute('referrerpolicy', 'no-referrer');
    }
  });

  hookConfigured = true;
}

/**
 * Sanitizes untrusted email HTML content using DOMPurify.
 * Removes scripts, forms, frames, objects, unsafe links, and event handlers.
 */
export function sanitizeEmailHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  ensurePurifyHooks();

  const clean = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'a', 'b', 'blockquote', 'br', 'caption', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'sup',
      'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'style', 'font', 'center',
    ],
    ALLOWED_ATTR: [
      'align', 'alt', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'class', 'color', 'colspan',
      'dir', 'height', 'href', 'id', 'loading', 'referrerpolicy', 'rel', 'rowspan', 'src', 'style',
      'target', 'title', 'valign', 'width',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'frame', 'object', 'embed', 'form', 'input', 'button', 'meta', 'base'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'formaction'],
    RETURN_TRUSTED_TYPE: false,
  });

  return String(clean);
}

/**
 * Safely converts plain text email into HTML with preserved formatting.
 */
export function formatPlainTextEmail(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') {
    return '';
  }

  // Escape HTML special characters
  const escaped = plainText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Convert URLs into safe links
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  const linked = escaped.replace(urlPattern, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow" class="text-primary underline hover:opacity-80">${url}</a>`;
  });

  // Preserve linebreaks
  return linked.replace(/\n/g, '<br />');
}
