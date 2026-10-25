# ReachInbox (Outbox Labs) - Full-Stack Email Job Scheduler

A production-grade, distributed Email Job Scheduler service and dashboard built with **Node.js (Express), TypeScript, BullMQ, Redis, PostgreSQL (Prisma), Elasticsearch, and Next.js (Tailwind CSS)**.

Designed and implemented following the **Outbox Labs Assignment** specification and pixel-perfect matching of the official Figma prototype.

---

## 🏗️ Architecture & Core Components

```text
OUTBOX_OCT/
├── docker-compose.yml          # PostgreSQL (5432), Redis (6379), Elasticsearch (9200)
├── sample_leads.csv            # Sample CSV for testing lead upload
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # User, EmailJob, SenderAccount models
│   └── src/
│       ├── config/
│       │   ├── db.ts           # PrismaClient singleton
│       │   ├── redis.ts        # IORedis connection (maxRetriesPerRequest: null)
│       │   ├── elasticsearch.ts# Elasticsearch client & index mappings
│       │   └── bullBoard.ts    # Bull-Board Express queue adapter
│       ├── queues/
│       │   └── email.queue.ts  # BullMQ delayed queue (email-queue)
│       ├── workers/
│       │   └── email.worker.ts # BullMQ worker (idempotency, throttling, rate limiting)
│       ├── services/
│       │   ├── mailer.service.ts      # Nodemailer + Ethereal fake SMTP
│       │   ├── scheduler.service.ts   # Scheduling & startup recovery
│       │   ├── rateLimiter.service.ts # Redis distributed hourly rate limiter
│       │   ├── slack.service.ts       # Slack OAuth & webhook notifications
│       │   └── search.service.ts      # Real-time Elasticsearch index & search
│       └── routes/
│           ├── email.routes.ts # /api/emails (schedule, scheduled, sent, search)
│           └── slack.routes.ts # /api/slack (oauth/start, callback, status, webhook)
└── frontend/
    └── src/
        ├── components/
        │   ├── LoginScreen.tsx      # Figma Image 1 (Google OAuth + Email login)
        │   ├── Sidebar.tsx          # Figma Images 2 & 3 (ONG logo, Oliver Brown, nav)
        │   ├── EmailListView.tsx    # Figma Images 2 & 3 (Peach & grey status badges)
        │   ├── EmailDetailView.tsx  # Figma Image 4 (Thread view, callout box, attachments)
        │   └── ComposeView.tsx      # Figma Image 5 (Lead parser, delay, hourly limit)
        └── pages/
            └── index.tsx            # Main state coordinator & view router
```

---

## ⚡ Key Architectural Features & Constraints

### 1. Strictly NO CRON (BullMQ Delayed Queue)
- No `node-cron`, `agenda`, or OS-level crontab is used.
- Scheduled emails calculate the millisecond delay `Math.max(0, scheduledAt.getTime() - Date.now())` and enter BullMQ as a **delayed job** with `jobId = emailJob.id` (database UUID).

### 2. Idempotency & Duplicate Prevention
- When the worker picks up an email job, it performs a database lookup to check its current status.
- If the status is already `SENT`, the job is skipped immediately to avoid duplicate email delivery.
- On delivery success, status transitions to `SENT` and `sentAt` is recorded atomically.

### 3. Server Restart Resilience (Startup Recovery)
- If the backend or Redis restarts, `recoverPendingJobs()` scans PostgreSQL on startup for any jobs with status `PENDING` or `RESCHEDULED`.
- It verifies if the job exists in the BullMQ queue. If not, it calculates the remaining delay (or `0` if already past due) and re-enqueues it automatically.

### 4. Distributed Multi-Instance Rate Limiting (Redis INCR)
- Hourly counters are stored in Redis under the deterministic key:
  `ratelimit:{senderId}:{YYYY-MM-DD-HH}`
- Atomic `INCR` sets a TTL of 3660s on the first send.
- **Zero Job Drops**: When the hourly quota is reached, jobs are **never failed or dropped**. Their database status updates to `RESCHEDULED`, and they are re-enqueued into BullMQ with a delay calculated to the exact start of the next UTC clock hour.

### 5. Real Slack OAuth & Alerts on Limit Hits
- Users can click **"Connect Slack"** in the sidebar to authenticate via Slack OAuth v2 (`/api/slack/oauth/start`).
- When a sender hits an hourly rate limit, the system alerts the user's connected Slack channel:
  `⚠️ Hourly email limit reached for sender {senderEmail}. Pending jobs are being rescheduled to the next hour window.`
- If Slack is not connected, it logs gracefully and skips without throwing errors.

### 6. Elasticsearch Full-Text Fuzzy Search
- Every created and updated email job is automatically synced to the `emails` Elasticsearch index.
- Search queries execute a fuzzy `multi_match` across `recipientEmail^3`, `subject^2`, and `body`.
- Includes a resilient fallback to PostgreSQL if Elasticsearch is temporarily offline.

### 7. Live Queue Metrics (Bull-Board)
- Live queue monitoring is mounted at:
  `http://localhost:5000/admin/queues`
- Real-time visibility into Delayed, Active, Completed, and Failed jobs.

---

## 🚀 Quick Start Guide

### Step 1: Start Docker Infrastructure
```bash
docker compose up -d
```
Verifies PostgreSQL (5432), Redis (6379), and Elasticsearch (9200) are healthy.

### Step 2: Database Migration
```bash
cd backend
npm install
npx prisma migrate dev --name init
```

### Step 3: Start Backend API (Port 5000)
```bash
npm run dev
```

### Step 4: Start Frontend Client (Port 3000)
```bash
cd ../frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🧪 Testing with cURL

### 1. Schedule an Email
```bash
curl -X POST http://localhost:5000/api/emails/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "candidate@example.com",
    "subject": "Interview Invitation",
    "body": "<h1>Welcome!</h1><p>Your interview is scheduled.</p>",
    "scheduledAt": "2026-10-25T12:00:00.000Z",
    "delaySeconds": 2
  }'
```

### 2. Full-Text Search via Elasticsearch
```bash
# Search by keyword
curl "http://localhost:5000/api/emails/search?q=Interview"

# Search with status filter
curl "http://localhost:5000/api/emails/search?q=candidate&status=PENDING"
```

### 3. Check Slack Status
```bash
curl http://localhost:5000/api/slack/status
```

### 4. Open Live Queue Dashboard
Navigate to:
```text
http://localhost:5000/admin/queues
```
