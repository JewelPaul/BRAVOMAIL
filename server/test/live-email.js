import { createApp } from '../src/app.js';
import { spawn } from 'node:child_process';

const app = createApp();
const server = app.listen(0);
const port = server.address().port;
console.log('[Live Test] Backend started on port:', port);

async function run() {
  try {
    // 1. Create account
    const createRes = await fetch(`http://127.0.0.1:${port}/api/accounts`, { method: 'POST' });
    if (!createRes.ok) throw new Error(`Create account failed: ${createRes.status}`);
    const acc = await createRes.json();
    console.log('[Live Test] Generated temporary address:', acc.address);

    // 2. Generate random OTP
    const sentOtp = String(Math.floor(100000 + Math.random() * 900000));
    console.log('[Live Test] Sending real external email with OTP:', sentOtp);

    // 3. Send email via SMTP to in.mail.tm
    const pythonScript = `
import smtplib
from email.mime.text import MIMEText

msg = MIMEText('Welcome to BravoMail! Your verification code is: ${sentOtp}. Valid for 10 minutes.')
msg['Subject'] = 'BravoMail Verification: ${sentOtp}'
msg['From'] = 'test-suite@bravomail.internal'
msg['To'] = '${acc.address}'

with smtplib.SMTP('in.mail.tm', 25, timeout=10) as s:
    s.send_message(msg)
print('EMAIL_SENT')
`;

    const py = spawn('python3', ['-c', pythonScript]);
    let pyOut = '';
    for await (const chunk of py.stdout) {
      pyOut += chunk.toString();
    }
    console.log('[Live Test] SMTP transmission:', pyOut.trim());

    // 4. Poll inbox
    console.log('[Live Test] Polling backend for incoming email...');
    let foundMsg = null;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`http://127.0.0.1:${port}/api/messages`, {
        headers: { Authorization: `Bearer ${acc.token}` },
      });
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        foundMsg = data.messages[0];
        console.log('[Live Test] Email arrived! ID:', foundMsg.id, 'Subject:', foundMsg.subject);
        break;
      }
      process.stdout.write('.');
    }
    console.log('');

    if (!foundMsg) {
      throw new Error('Timed out waiting for real email arrival.');
    }

    // 5. Fetch details
    const detailRes = await fetch(`http://127.0.0.1:${port}/api/messages/${foundMsg.id}`, {
      headers: { Authorization: `Bearer ${acc.token}` },
    });
    const detail = await detailRes.json();
    console.log('[Live Test] Content text received:', detail.text.trim());

    // Verify OTP exists in text
    if (!detail.text.includes(sentOtp)) {
      throw new Error(`Expected OTP ${sentOtp} not found in received message body!`);
    }

    console.log(`[Live Test] Verified: Message contains OTP ${sentOtp}!`);

    // 6. Delete account
    const delRes = await fetch(`http://127.0.0.1:${port}/api/accounts`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${acc.token}` },
    });
    console.log('[Live Test] Cleanup account status:', delRes.status);
    console.log('[Live Test] ALL REAL INTEGRATION CHECKS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('[Live Test] Failed:', err);
  process.exit(1);
});
