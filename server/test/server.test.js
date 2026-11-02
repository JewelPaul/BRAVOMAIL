import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken } from '../src/session.js';
import { createApp } from '../src/app.js';

test('Session Token - creates and verifies valid token', () => {
  const token = createSessionToken({
    accountId: 'acc_12345',
    address: 'user@fldubai.com',
    providerToken: 'prov_jwt_token_abc',
  }, 10);

  assert.ok(typeof token === 'string');
  assert.equal(token.split('.').length, 3);

  const session = verifySessionToken(token);
  assert.equal(session.accountId, 'acc_12345');
  assert.equal(session.address, 'user@fldubai.com');
  assert.equal(session.providerToken, 'prov_jwt_token_abc');
  assert.ok(session.expiresAt > Date.now());
});

test('Session Token - rejects expired token', () => {
  // Create token with negative expiry
  const token = createSessionToken({
    accountId: 'acc_expired',
    address: 'expired@fldubai.com',
    providerToken: 'prov_jwt_token',
  }, -5);

  assert.throws(() => {
    verifySessionToken(token);
  }, /expired/i);
});

test('Session Token - rejects tampered token', () => {
  const token = createSessionToken({ accountId: 'acc_valid' }, 10);
  const parts = token.split('.');
  // Alter ciphertext
  parts[1] = 'corrupted_ciphertext_abc';
  const tamperedToken = parts.join('.');

  assert.throws(() => {
    verifySessionToken(tamperedToken);
  }, /tampered/i);
});

test('App - health endpoint returns valid status', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.service, 'BravoMail Backend');
    assert.equal(data.provider, 'mail.tm');
  } finally {
    server.close();
  }
});

test('App - returns 401 on protected endpoint without token', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/messages`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.code, 'UNAUTHORIZED');
  } finally {
    server.close();
  }
});

test('App - returns 404 on non-existent endpoint', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/unknown-endpoint`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.code, 'NOT_FOUND');
  } finally {
    server.close();
  }
});
