import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import EmailViewer from '@/components/EmailViewer';
import EmailInbox from '@/components/EmailInbox';
import { EmailContent, EmailAccount } from '@/services/mailApi';

describe('UI Components', () => {
  const mockEmailWithOTP: EmailContent = {
    id: 'msg_otp_1',
    from: { name: 'Verification System', address: 'no-reply@verify.com' },
    subject: 'Your Login Code is 482910',
    intro: 'Your verification code is 482910',
    text: 'Your verification code is 482910. Do not share this code.',
    html: '<p>Your verification code is <b>482910</b></p>',
    seen: false,
    createdAt: new Date().toISOString(),
    size: 1500,
  };

  const mockEmailWithoutOTP: EmailContent = {
    id: 'msg_plain_1',
    from: { name: 'Newsletter', address: 'newsletter@news.com' },
    subject: 'Weekly Tech Digest',
    intro: 'Here is what happened this week in technology.',
    text: 'Here is what happened this week in technology. Enjoy the read!',
    html: '<p>Here is what happened this week in technology.</p>',
    seen: true,
    createdAt: new Date().toISOString(),
    size: 3200,
  };

  it('EmailViewer renders detected OTP banner with 1-click copy button', async () => {
    const handleBack = vi.fn();
    render(<EmailViewer email={mockEmailWithOTP} onBack={handleBack} />);

    // Should display verification code banner
    expect(screen.getByText('Verification Code Detected')).toBeInTheDocument();
    expect(screen.getAllByText('482910').length).toBeGreaterThan(0);
    expect(screen.getByText(/Copy OTP Code/i)).toBeInTheDocument();
  });

  it('EmailViewer indicates when no verification code is detected', () => {
    const handleBack = vi.fn();
    render(<EmailViewer email={mockEmailWithoutOTP} onBack={handleBack} />);

    expect(screen.getByText(/No verification code detected in this message/i)).toBeInTheDocument();
    expect(screen.queryByText('Verification Code Detected')).not.toBeInTheDocument();
  });

  it('EmailViewer supports switching between Rich HTML and Plain Text views', () => {
    const handleBack = vi.fn();
    render(<EmailViewer email={mockEmailWithOTP} onBack={handleBack} />);

    const plainTextBtn = screen.getByRole('button', { name: /Plain Text/i });
    expect(plainTextBtn).toBeInTheDocument();

    fireEvent.click(plainTextBtn);
    expect(screen.getByRole('button', { name: /Rich HTML/i })).toBeInTheDocument();
  });

  it('EmailInbox displays empty state message when no active account exists', async () => {
    await act(async () => {
      render(<EmailInbox currentAccount={null} />);
    });
    expect(screen.getByText('No Active Address')).toBeInTheDocument();
  });

  it('EmailInbox displays waiting state when account is active but inbox is empty', async () => {
    const mockAccount: EmailAccount = {
      id: 'acc_123',
      address: 'bm_test@fldubai.com',
      token: 'valid_token',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    };

    await act(async () => {
      render(<EmailInbox currentAccount={mockAccount} />);
    });
    expect(screen.getByText('Waiting for Incoming Messages')).toBeInTheDocument();
    const addressElements = screen.getAllByText(/bm_test@fldubai.com/i);
    expect(addressElements.length).toBeGreaterThan(0);
  });
});
