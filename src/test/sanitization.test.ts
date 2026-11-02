import { describe, it, expect } from 'vitest';
import { sanitizeEmailHtml, formatPlainTextEmail } from '@/utils/sanitize';

describe('Email Content Security & Sanitization', () => {
  it('strips <script> tags and malicious inline code', () => {
    const malicious = '<div>Safe content<script>alert("XSS Attack!");</script></div>';
    const clean = sanitizeEmailHtml(malicious);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert');
    expect(clean).toContain('Safe content');
  });

  it('strips dangerous event handlers (onerror, onload, onclick, onmouseover)', () => {
    const malicious = '<img src="invalid.jpg" onerror="alert(1)" onload="fetch(\'/stolen\')" onclick="evil()" />';
    const clean = sanitizeEmailHtml(malicious);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onload');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('alert');
  });

  it('strips dangerous embedded elements: <iframe>, <object>, <embed>, <form>', () => {
    const malicious = `
      <div>
        <iframe src="https://evil-site.com"></iframe>
        <object data="malware.swf"></object>
        <embed src="flash.swf"></embed>
        <form action="https://phishing.com"><input type="password" name="pw" /></form>
      </div>
    `;
    const clean = sanitizeEmailHtml(malicious);
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('<object');
    expect(clean).not.toContain('<embed');
    expect(clean).not.toContain('<form');
    expect(clean).not.toContain('<input');
  });

  it('neutralizes dangerous javascript: and vbscript: URL protocols in links', () => {
    const malicious = '<a href="javascript:alert(document.cookie)">Click to verify</a>';
    const clean = sanitizeEmailHtml(malicious);
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('Click to verify');
  });

  it('enforces secure target="_blank" and rel="noopener noreferrer nofollow" on legitimate links', () => {
    const input = '<a href="https://example.com/verify">Verify Account</a>';
    const clean = sanitizeEmailHtml(input);
    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
    expect(clean).toContain('href="https://example.com/verify"');
  });

  it('adds loading="lazy" and referrerpolicy="no-referrer" on images', () => {
    const input = '<img src="https://example.com/logo.png" alt="Logo" />';
    const clean = sanitizeEmailHtml(input);
    expect(clean).toContain('loading="lazy"');
    expect(clean).toContain('referrerpolicy="no-referrer"');
  });

  it('formats plain text emails safely, preserving newlines and escaping special chars', () => {
    const text = 'Hello <world>,\nYour link is https://example.com/login\nThank you & goodbye.';
    const formatted = formatPlainTextEmail(text);
    expect(formatted).not.toContain('<world>');
    expect(formatted).toContain('&lt;world&gt;');
    expect(formatted).toContain('<br />');
    expect(formatted).toContain('&amp; goodbye');
    expect(formatted).toContain('<a href="https://example.com/login" target="_blank"');
  });
});
