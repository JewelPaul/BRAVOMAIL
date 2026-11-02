import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Build & Asset Paths Verification', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const distDir = path.join(rootDir, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const dist404 = path.join(distDir, '404.html');

  it('generates dist/index.html with correct /BRAVOMAIL/ base path for GitHub Pages', () => {
    expect(fs.existsSync(distIndex)).toBe(true);
    const content = fs.readFileSync(distIndex, 'utf8');

    // Should include /BRAVOMAIL/ base prefix on script and stylesheet tags
    expect(content).toMatch(/href="\/BRAVOMAIL\/assets\//);
    expect(content).toMatch(/src="\/BRAVOMAIL\/assets\//);
    expect(content).toMatch(/href="\/BRAVOMAIL\/favicon\.svg"/);
    expect(content).toMatch(/href="\/BRAVOMAIL\/site\.webmanifest"/);
  });

  it('generates dist/404.html for GitHub Pages single-page-application route fallback', () => {
    expect(fs.existsSync(dist404)).toBe(true);
    const content404 = fs.readFileSync(dist404, 'utf8');
    const contentIndex = fs.readFileSync(distIndex, 'utf8');

    expect(content404).toBe(contentIndex);
  });

  it('verifies that no fake or hardcoded mock emails exist in client production service', () => {
    const mailApiService = fs.readFileSync(path.join(rootDir, 'src/services/mailApi.ts'), 'utf8');

    // Ensure no hardcoded mock addresses, fake messages, or sample OTPs
    expect(mailApiService).not.toContain('mockEmails');
    expect(mailApiService).not.toContain('fakeAccount');
    expect(mailApiService).not.toContain('sample-email');
    expect(mailApiService).not.toContain('corsproxy.io');
  });
});
