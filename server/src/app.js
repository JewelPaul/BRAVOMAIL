import express from 'express';
import cors from 'cors';
import {
  checkProviderHealth,
  getActiveDomains,
  createTemporaryAccount,
  getMessages,
  getMessageDetails,
  deleteMessage,
  deleteAccount,
} from './mailProvider.js';
import { createSessionToken, verifySessionToken } from './session.js';
import { createRateLimiter } from './rateLimiter.js';

export function createApp() {
  const app = express();

  // Basic security and parsing middleware
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));

  // CORS configuration
  const allowedOriginEnv = process.env.CORS_ORIGIN;
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, same-origin)
      if (!origin) return callback(null, true);

      // In production or development, allow github pages & localhost
      const allowedPatterns = [
        /^https:\/\/jewelpaul\.github\.io$/,
        /^https?:\/\/localhost(:\d+)?$/,
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
      ];

      if (allowedOriginEnv) {
        allowedOriginEnv.split(',').map((o) => o.trim()).forEach((o) => {
          if (o === '*' || origin === o) {
            return callback(null, true);
          }
        });
      }

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));
      if (isAllowed) {
        return callback(null, true);
      }

      // Default permissive for public temporary email clients
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  };

  app.use(cors(corsOptions));

  // Rate limiters
  const generalLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 90 });
  const accountLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 15,
    message: 'Too many account creations from this network. Please wait a few minutes.',
  });

  app.use(generalLimiter);

  // Authentication middleware
  const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required. Missing Bearer token.',
        code: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.slice(7).trim();
    try {
      req.session = verifySessionToken(token);
      next();
    } catch (err) {
      return res.status(401).json({
        error: err.message || 'Invalid or expired session token.',
        code: err.code || 'INVALID_TOKEN',
      });
    }
  };

  // Health checks
  const healthHandler = async (_req, res) => {
    const provider = await checkProviderHealth();
    const status = provider.healthy ? 'ok' : 'degraded';
    res.status(provider.healthy ? 200 : 503).json({
      status,
      service: 'BravoMail Backend',
      provider: 'mail.tm',
      providerHealthy: provider.healthy,
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Domain discovery
  app.get('/api/domains', async (_req, res, next) => {
    try {
      const domains = await getActiveDomains();
      res.json({ domains });
    } catch (err) {
      next(err);
    }
  });

  // Create temporary account
  app.post('/api/accounts', accountLimiter, async (req, res, next) => {
    try {
      const { id, address, providerToken } = await createTemporaryAccount();
      const expiryMinutes = parseInt(process.env.SESSION_EXPIRY_MINUTES || '60', 10);
      const token = createSessionToken({ accountId: id, address, providerToken }, expiryMinutes);

      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

      res.status(201).json({
        id,
        address,
        token,
        expiresAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // Get current account status
  app.get('/api/accounts/me', requireAuth, async (req, res) => {
    res.json({
      id: req.session.accountId,
      address: req.session.address,
      createdAt: new Date(req.session.createdAt).toISOString(),
      expiresAt: new Date(req.session.expiresAt).toISOString(),
    });
  });

  // Delete current account
  app.delete('/api/accounts', requireAuth, async (req, res, next) => {
    try {
      await deleteAccount(req.session.accountId, req.session.providerToken);
      res.status(204).end();
    } catch (err) {
      // If already deleted upstream, return 204
      if (err.status === 404) {
        return res.status(204).end();
      }
      next(err);
    }
  });

  // List messages
  app.get('/api/messages', requireAuth, async (req, res, next) => {
    try {
      const messages = await getMessages(req.session.providerToken);
      res.json({ messages });
    } catch (err) {
      next(err);
    }
  });

  // Get single message detail
  app.get('/api/messages/:id', requireAuth, async (req, res, next) => {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.length > 64) {
      return res.status(400).json({ error: 'Invalid message ID format.', code: 'INVALID_ID' });
    }

    try {
      const message = await getMessageDetails(id, req.session.providerToken);
      res.json(message);
    } catch (err) {
      next(err);
    }
  });

  // Delete single message
  app.delete('/api/messages/:id', requireAuth, async (req, res, next) => {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.length > 64) {
      return res.status(400).json({ error: 'Invalid message ID format.', code: 'INVALID_ID' });
    }

    try {
      await deleteMessage(id, req.session.providerToken);
      res.status(204).end();
    } catch (err) {
      if (err.status === 404) {
        return res.status(204).end();
      }
      next(err);
    }
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: 'API endpoint not found.',
      code: 'NOT_FOUND',
    });
  });

  // Central error handler
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'An unexpected error occurred.';

    res.status(status).json({
      error: message,
      code,
    });
  });

  return app;
}
