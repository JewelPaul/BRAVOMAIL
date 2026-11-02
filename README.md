# 🛡️ BravoMail — Production Temporary Email Service

BravoMail is a fast, privacy-focused temporary email web application built with React, TypeScript, Tailwind CSS, Vite, and an isolated backend architecture interfacing with genuine disposable email infrastructure.

Live GitHub Pages site: **[https://jewelpaul.github.io/BRAVOMAIL/](https://jewelpaul.github.io/BRAVOMAIL/)**

---

## 📋 What BravoMail Does

BravoMail allows users to generate disposable temporary email addresses on demand to keep personal inboxes clean from spam, trackers, and marketing emails.

- **Instant Address Generation**: Generates genuine temporary email inboxes through genuine disposable email infrastructure.
- **Real Inbound Email Receiving**: Receives actual inbound emails from external senders worldwide.
- **Real-Time Live Inbox**: Polls automatically for new messages with active tab detection, unread status indicators, and manual refresh controls.
- **Smart Contextual OTP Detection**: Analyzes real email contents to extract 4-digit, 6-digit, 8-digit numeric codes, alphanumeric verification codes, and prefixed verification codes (e.g. `G-123456`, `123-456`), with 1-click copy functionality.
- **Robust Email Sanitization**: Strict HTML sanitization via DOMPurify that neutralizes `<script>`, `<iframe>`, `onload`/`onerror` handlers, dangerous protocols (`javascript:`), and isolates untrusted styles, with a plain-text email view toggle.
- **Temporary Lifecycle & Explicit Deletion**: Enforces account expiration timestamps and allows users to immediately destroy/delete their temporary mailbox and associated messages on demand.
- **Zero Mock / Zero Fake Data**: Every account, message, timestamp, and verification code comes from real email interactions.

---

## 🏗️ Architecture

BravoMail follows a decoupled architecture designed for secure static hosting:

```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│           FRONTEND (SPA)             │       │           BACKEND SERVICE            │       │         UPSTREAM EMAIL ENGINE        │
│                                      │       │                                      │       │                                      │
│  Hosted on GitHub Pages              │ HTTP  │  Node.js / Express or Serverless     │ HTTPS │  Mail.tm API & MX Servers            │
│  https://jewelpaul.github.io/BRAVOMAIL/├──────>  (Render, Railway, Fly.io, Vercel)  ├──────>  Inbound MX: in.mail.tm:25            │
│  Configured via VITE_API_BASE_URL    │       │  - Rate Limiter                      │       │  Active domains: fldubai.com         │
│  - Sanitized DOMPurify rendering     │       │  - AES-256-GCM Session Tokens        │       │                                      │
│  - In-browser OTP detection engine   │       │  - Request validation                │       │                                      │
└──────────────────────────────────────┘       └──────────────────────────────────────┘       └──────────────────────────────────────┘
```

### Why a Dedicated Backend?
1. **No Insecure Public CORS Proxies**: Previously, temporary email clients attempted to send private authentication tokens through untrusted third-party proxies (e.g. `corsproxy.io`), which frequently fail with HTTP 403, leak authentication tokens, and violate user security.
2. **Credential & Provider Isolation**: The browser client receives an encrypted, tamper-proof session token (`AES-256-GCM`). Raw mailbox passwords and provider tokens never leak to the client.
3. **Abuse & Rate Limit Protection**: The backend enforces sliding-window rate limits to shield upstream mail providers from abuse.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Target | Purpose | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Frontend (Public) | URL of the deployed BravoMail backend server | `http://localhost:3001` or `https://bravomail-api.onrender.com` |
| `PORT` | Backend (Private) | Local port for Express server | `3001` |
| `SESSION_SECRET` | Backend (Private) | 32+ character key for AES-256-GCM session tokens | `openssl rand -hex 32` |
| `SESSION_EXPIRY_MINUTES` | Backend (Private) | Lifetime of generated temporary mailboxes | `60` |
| `CORS_ORIGIN` | Backend (Private) | Allowed frontend origin(s) | `https://jewelpaul.github.io` |

> [!IMPORTANT]
> `VITE_` variables are public and bundled into the browser JavaScript. Never store private API keys or server secrets in `VITE_` variables.

---

## 💻 Local Development

### 1. Prerequisites
- Node.js 20+
- npm 10+

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Backend Server
```bash
npm run server:dev
# Running at http://localhost:3001
# Health check available at http://localhost:3001/health
```

### 4. Start the Frontend Dev Server
In a separate terminal:
```bash
npm run dev
# Frontend runs at http://localhost:8080
```

---

## 🧪 Testing

BravoMail includes a comprehensive automated test suite covering:
- Account generation and expiration
- Backend configuration failure states
- Upstream provider error handling
- OTP detection accuracy and false positive rejection
- HTML email sanitization and XSS mitigation
- Production asset paths and GitHub Pages SPA fallback

Run all client and backend tests:
```bash
npm test
```

Run linter:
```bash
npm run lint
```

Build production client:
```bash
npm run build
```

---

## 🚀 Deployment Guide

### Deploying the Frontend (GitHub Pages)

The frontend is deployed to GitHub Pages at `https://jewelpaul.github.io/BRAVOMAIL/`.

1. Go to your GitHub repository: **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Under **Settings → Secrets and variables → Actions → Variables**, add a repository variable:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: Your deployed backend URL (e.g. `https://your-bravomail-api.onrender.com`)
4. Pushing to the `main` branch automatically runs `.github/workflows/deploy-pages.yml`, runs all tests, builds the assets to `./dist` with base `/BRAVOMAIL/`, and deploys them to GitHub Pages.

### Deploying the Backend

The backend can be deployed for free on any Node.js hosting platform:

#### Option A: Render (Recommended, 1-Click)
1. Fork or push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint** and select your repository (reads [`render.yaml`](./render.yaml)).
3. Or create a **Web Service**:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**:
     - `NODE_ENV`: `production`
     - `PORT`: `10000`
     - `SESSION_SECRET`: generate with `openssl rand -hex 32`
     - `CORS_ORIGIN`: `https://jewelpaul.github.io`
4. Copy your Render service URL (e.g. `https://bravomail-api.onrender.com`) into your GitHub Actions variable `VITE_API_BASE_URL`.

#### Option B: Docker Container
A production-ready [`Dockerfile`](./Dockerfile) is provided:
```bash
docker build -t bravomail-backend .
docker run -p 3001:3001 -e SESSION_SECRET="your-secret" bravomail-backend
```

#### Option C: Vercel Serverless
The repository includes an [`api/index.js`](./api/index.js) serverless handler. You can import the repository into Vercel and set `SESSION_SECRET` and `CORS_ORIGIN` in Project Settings.

---

## 🔒 Security & Privacy Limitations

- **Disposable Nature**: Temporary email addresses use shared public domains provided by disposable mail networks. Anyone with temporary address credentials can view received messages until the session expires or is deleted.
- **Do Not Use for Critical Accounts**: Never use temporary email services for banking, medical, legal, or permanent identity verification.
- **Email Content Security**: All incoming HTML is stripped of executable code, event handlers, frames, and forms via DOMPurify before display.
- **Expiration & Cleanup**: Mailboxes expire automatically after the configured duration (default: 60 minutes) or immediately upon user deletion.

---

## 📄 License

This project is licensed under the terms of the [LICENSE](./LICENSE) file.
