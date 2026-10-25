# ONG Outbox - Production-Grade Email Job Scheduler & Dashboard

A scalable, resilient email scheduling platform built with **TypeScript, Node.js (Express), BullMQ, Redis, PostgreSQL, Elasticsearch, and Next.js / Tailwind CSS**.

Designed and implemented following the **Outbox Labs / ReachInbox Assignment** specification with pixel-perfect alignment to the official Figma prototype.

---

## 🌐 Live Production Deployments
- **Live Frontend Application (Vercel)**: [https://outbox-lab-email-sender.vercel.app](https://outbox-lab-email-sender.vercel.app)
- **Live Backend API (Render)**: [https://reachinbox-scheduler-backend-jddz.onrender.com](https://reachinbox-scheduler-backend-jddz.onrender.com)
- **Live BullMQ Queue Visualizer (Bull-Board)**: [https://reachinbox-scheduler-backend-jddz.onrender.com/admin/queues](https://reachinbox-scheduler-backend-jddz.onrender.com/admin/queues)
- **Backend Health Check**: [https://reachinbox-scheduler-backend-jddz.onrender.com/health](https://reachinbox-scheduler-backend-jddz.onrender.com/health)

---

## 🚀 Key Features & Highlights

- **Zero-Cron Scheduling:** Strictly no `node-cron`, `agenda`, or OS crontabs. All emails are scheduled via native BullMQ delayed jobs backed by Redis sorted sets (`ZSET`).
- **Server Restart Resilience:** Built-in startup recovery (`recoverPendingJobs`) queries PostgreSQL for uncompleted jobs and restores them into BullMQ so no scheduled emails are dropped.
- **Idempotency & Deduplication:** BullMQ `jobId` maps directly to database IDs. Workers verify job states in PostgreSQL prior to dispatch to eliminate duplicate sends.
- **Distributed Hourly Rate Limiting:** Multi-worker safe atomic Redis `INCR` counters keyed by hour window (`ratelimit:{senderId}:{hourKey}`).
- **No Job Loss (Automatic Reschedule):** Jobs exceeding hourly quotas are never failed or dropped; they are transitioned to `RESCHEDULED` and pushed to the start of the next hour window.
- **Live Slack Alerting:** Integrated Slack OAuth & Webhook support that alerts users directly the moment an hourly limit is hit.
- **Full-Text Search:** Elasticsearch synchronization for real-time indexed search across subjects, recipients, and bodies.
- **Real-Time Queue Visualizer:** Bull-Board dashboard mounted on `/admin/queues` for inspecting active, waiting, delayed, and completed jobs.
- **Figma-Aligned UI:** Next.js dashboard featuring Google OAuth login, Scheduled/Sent dynamic tabs, dynamic lead file upload (CSV), rich-text editing (Bold, Italic, Lists, Quotes), and side-by-side master-detail email thread viewer.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, TypeScript
- **Queue & In-Memory Store:** BullMQ, Redis (Upstash in Cloud, Redis 7 locally)
- **Database & ORM:** PostgreSQL, Prisma ORM
- **Search Engine:** Elasticsearch (with resilient database fallback)
- **Email Service (Test SMTP):** Nodemailer + Ethereal Email (with cloud sandbox resilience)
- **Monitoring:** `@bull-board/express`
- **Frontend:** Next.js, React, Tailwind CSS, `@react-oauth/google`

---

## ⚙️ Architecture & Design Decisions

### 1. Zero-Cron Delay Strategy
Instead of running a recurring cron interval checking the database, each email's target time is computed relative to the current timestamp:
$$\text{delayMs} = \max(0, \text{scheduledAt} - \text{Date.now()})$$
BullMQ stores delayed jobs inside Redis sorted sets (`ZSET`). Redis automatically promotes delayed jobs to the active queue at the exact millisecond without CPU polling.

### 2. Distributed Rate Limiting & Rescheduling
- **Key Pattern:** `ratelimit:{senderId}:{YYYY-MM-DD-HH}`
- **Atomic Operations:** Uses Redis `INCR` with a 1-hour TTL (3660s buffer).
- **Rescheduling Logic:** If the counter exceeds the sender's configured `maxPerHour`, the remaining milliseconds until the next clock hour are calculated, and the BullMQ job is delayed to the next window with status updated to `RESCHEDULED`.
- **Alert Dispatch:** Triggers `notifyRateLimitReached()` to send a real-time alert to the user's connected Slack channel.

### 3. Server Restart Recovery
When the backend container or process restarts, the server runs `recoverPendingJobs()` on startup:
1. Queries PostgreSQL for records with status `PENDING` or `RESCHEDULED` where `sentAt` is `null`.
2. Checks whether the job already exists in BullMQ.
3. If missing, calculates the remaining delay (or `0` if past due) and re-enqueues it with the original database UUID as the `jobId`.

---

## 📦 Local Setup Instructions

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (v18+) & npm

### 2. Start Infrastructure Containers
Run the Docker stack (PostgreSQL, Redis, and Elasticsearch):
```bash
docker compose up -d
```
Verifies PostgreSQL (5432), Redis (6379), and Elasticsearch (9200) are healthy.

### 3. Backend Setup
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```
Backend runs on `http://localhost:5000` with Bull-Board at `http://localhost:5000/admin/queues`.

### 4. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

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
    "scheduledAt": "2026-10-25T14:00:00.000Z",
    "delaySeconds": 2
  }'
```

### 2. Full-Text Search via Elasticsearch
```bash
# Fuzzy search by keyword
curl "http://localhost:5000/api/emails/search?q=Interview"

# Search with status filter
curl "http://localhost:5000/api/emails/search?q=candidate&status=SENT"
```

### 3. Check Slack Status
```bash
curl http://localhost:5000/api/slack/status
```

---

## 📹 5-Minute Demo Video Walkthrough Script

### Evaluator GitHub Access:
Please invite the ReachInbox reviewers to this private repository:
- **`Mitrajit`**
- **`Yadav036`**

### Recommended Screen Recording Sequence:
1. **Google OAuth & Dashboard UI (`https://outbox-lab-email-sender.vercel.app`)**:
   - Showcase login with Google account.
   - Show user avatar, email, and sidebar navigation (`Scheduled` vs `Sent`).
   - Click "+ Connect Slack" to demonstrate the live green `Slack Connected (#email-alerts)` badge.
2. **Compose & Lead Upload (`Compose` button)**:
   - Click "Compose" to open the rich composer.
   - Upload `sample_leads.csv` — show auto-detected recipient tags.
   - Type subject and rich text body (use Bold, Italic, and Bullet lists).
   - Set Delay (e.g. 2 sec) and Hourly Limit (e.g. 10/hr).
   - Click **"Send Later"** — show success toast and instant update of `Scheduled` counter.
3. **BullMQ Live Queue Metrics (`https://reachinbox-scheduler-backend-jddz.onrender.com/admin/queues`)**:
   - Open Bull-Board queue dashboard.
   - Show the newly scheduled job appearing in `Delayed` status with the calculated delay countdown.
4. **Server Restart Resilience Proof**:
   - Open backend terminal and stop the server (`Ctrl+C`).
   - Show that jobs in PostgreSQL remain safe.
   - Restart the server (`npm run dev`) and show the terminal log:
     `[Recovery] Scanning database for uncompleted jobs...`
     `[Recovery] Re-enqueued job ...`
   - Show the email reaching its target time and sending automatically without cron!
5. **Rate Limiting & Slack Alert**:
   - Demonstrate sender hourly rate limit hit.
   - Show terminal log:
     `[RateLimit] Limit reached for sender... Rescheduling job to next hour window.`
     `[Slack Alert Delivered] ⚠️ Hourly Email Limit Reached`
   - Show job status transitioning to `RESCHEDULED` in database and Elasticsearch.
6. **Elasticsearch Full-Text Search**:
   - In the search bar on the dashboard, type keywords (e.g. `alex` or subject keyword) to show instant fuzzy search across recipient, subject, and body.
