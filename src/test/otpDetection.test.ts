import { describe, it, expect } from 'vitest';
import { detectOTPs, extractTextFromHtml } from '@/utils/otpDetection';

describe('OTP Detection Engine', () => {
  it('detects 6-digit numeric OTP with standard verification phrasing', () => {
    const text = 'Your verification code is 849201. It will expire in 10 minutes.';
    const otps = detectOTPs(text);
    expect(otps.length).toBeGreaterThan(0);
    expect(otps[0].code).toBe('849201');
    expect(otps[0].type).toBe('numeric');
    expect(otps[0].confidence).toBe('high');
  });

  it('detects 4-digit and 8-digit numeric verification codes', () => {
    const text4 = 'Your security PIN code is: 4819. Do not share it.';
    const otps4 = detectOTPs(text4);
    expect(otps4.length).toBeGreaterThan(0);
    expect(otps4[0].code).toBe('4819');

    const text8 = 'Your confirmation code is 91827364. Valid for 15 minutes.';
    const otps8 = detectOTPs(text8);
    expect(otps8.length).toBeGreaterThan(0);
    expect(otps8[0].code).toBe('91827364');
  });

  it('detects alphanumeric verification codes', () => {
    const text = 'Your login passcode is: AB49Z2. Enter it to continue.';
    const otps = detectOTPs(text);
    expect(otps.length).toBeGreaterThan(0);
    expect(otps[0].code).toBe('AB49Z2');
    expect(otps[0].type).toBe('alphanumeric');
  });

  it('detects formatted codes like G-123456 and hyphenated codes 491-823', () => {
    const textG = 'Your Google verification code is G-492810.';
    const otpsG = detectOTPs(textG);
    expect(otpsG.length).toBeGreaterThan(0);
    expect(otpsG[0].code).toBe('492810');

    const textHyphen = 'Enter your security code 382-910 to confirm login.';
    const otpsHyphen = detectOTPs(textHyphen);
    expect(otpsHyphen.length).toBeGreaterThan(0);
    expect(otpsHyphen[0].code).toBe('382-910');
  });

  it('extracts OTP from complex HTML email content', () => {
    const html = `
      <html>
        <body>
          <div style="font-family: Arial;">
            <h1>Confirm your email</h1>
            <p>Please enter the following one-time code:</p>
            <div style="font-size: 24px; font-weight: bold;">726194</div>
            <p>This code expires in 5 minutes.</p>
          </div>
        </body>
      </html>
    `;
    const otps = detectOTPs(html);
    expect(otps.length).toBeGreaterThan(0);
    expect(otps[0].code).toBe('726194');
  });

  it('rejects ordinary years, dates, prices, and phone numbers without OTP context', () => {
    const text = 'Copyright 2026 Acme Corp. Your total is $4500. Call +1-800-555-0199 for help. Order #987654.';
    const otps = detectOTPs(text);
    expect(otps.length).toBe(0);
  });

  it('returns empty array when no verification code exists', () => {
    const text = 'Hi John, just checking in to see if you are available for lunch tomorrow. Let me know!';
    const otps = detectOTPs(text);
    expect(otps).toEqual([]);
  });

  it('extracts text cleanly from HTML without tag residue', () => {
    const raw = '<p>Hello <b>World</b>&nbsp;&amp; welcome</p>';
    expect(extractTextFromHtml(raw)).toBe('Hello World & welcome');
  });
});
