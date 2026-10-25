# ONG Outbox - Production-Grade Email Job Scheduler & Dashboard

A scalable, resilient email scheduling platform built with **TypeScript, Node.js (Express), BullMQ, Redis, PostgreSQL, Elasticsearch, and Next.js / Tailwind CSS**.

Designed and implemented strictly following the **ReachInbox / Outbox Labs Assignment** specification and pixel-perfect matching of the official Figma prototype.

---

## 🌐 Live Production Deployments
- **Live Frontend Application (Vercel)**: [https://outbox-lab-email-sender.vercel.app](https://outbox-lab-email-sender.vercel.app)
- **Live Backend API (Render)**: [https://reachinbox-scheduler-backend-jddz.onrender.com](https://reachinbox-scheduler-backend-jddz.onrender.com)
- **Live BullMQ Queue Visualizer (Bull-Board)**: [https://reachinbox-scheduler-backend-jddz.onrender.com/admin/queues](https://reachinbox-scheduler-backend-jddz.onrender.com/admin/queues)
- **Backend Health Check**: [https://reachinbox-scheduler-backend-jddz.onrender.com/health](https://reachinbox-scheduler-backend-jddz.onrender.com/health)
- **GitHub Repository**: [https://github.com/saradoegar/OutboxLabEmailSender](https://github.com/saradoegar/OutboxLabEmailSender)

---

## 📋 Features Implemented (Rubric Mapping)

### 1. Backend Features
| Feature Area | Implementation Details |
| :--- | :--- |
| **Scheduler (Zero-Cron)** | Native BullMQ delayed jobs backed by Redis sorted sets (`ZSET`). Delay is computed as $\text{delayMs} = \max(0, \text{scheduledAt} - \text{Date.now()})$. Strictly **no cron packages** (`node-cron`, `agenda`, OS crontab) are used. |
| **Persistence on Restart** | On server startup, `recoverPendingJobs()` scans PostgreSQL for uncompleted jobs (`PENDING` / `RESCHEDULED`), checks BullMQ queue state, and re-enqueues missing jobs with remaining delay using database UUIDs as `jobId` for deduplication. |
| **Distributed Rate Limiting** | Multi-worker safe atomic Redis `INCR` on `ratelimit:{senderId}:{YYYY-MM-DD-HH}` with a 3660s TTL. **Zero Job Loss**: Exceeded jobs are never dropped; their status transitions to `RESCHEDULED` and they are delayed to the start of the next hour window. |
| **Concurrency & Throttling** | BullMQ worker runs with configurable concurrency (`WORKER_CONCURRENCY=5`). Provider delay throttling is simulated per sender using `delaySeconds` (e.g. 2s) sleep before dispatch. |
| **Slack OAuth & Alerting** | Integrated Slack integration (`/api/slack/oauth/start`, `/api/slack/status`). Automatically sends formatted Slack alerts when an hourly limit is breached. |
| **Full-Text Search** | Every email created or updated syncs to the `emails` Elasticsearch index for fuzzy multi-field search (`recipientEmail^3`, `subject^2`, `body`) with resilient database fallback. |

### 2. Frontend Features
| Feature Area | Implementation Details |
| :--- | :--- |
| **Authentication** | Real Google OAuth login screen using `@react-oauth/google` with avatar, email, and user name display in the sidebar (Figma Image 1). |
| **Dashboard Views** | Master-Detail Two-Pane layout (Figma Images 2 & 3). Middle pane displays email thread list with peach scheduled clock badges and grey sent badges; right pane displays full email details. |
| **Dynamic Tabs** | Dynamic `Scheduled` and `Sent` tabs backed by real PostgreSQL and Elasticsearch endpoints with live counters and 3-second polling. |
| **Composer & CSV Upload** | Modal/view with CSV lead parser (`sample_leads.csv`), delay and hourly limit inputs, target datetime selector, and WYSIWYG toolbar (Bold, Italic, Underline, Bullet/Numbered Lists, Blockquotes). |
| **Queue Visualizer Link** | Sidebar navigation link directly opening Bull-Board dashboard for queue inspection. |

---

## ⚙️ Architecture & Design Decisions

### 1. How Scheduling Works (Zero-Cron)
Instead of running a recurring cron interval checking the database, each email's target time is computed relative to the current timestamp:
$$\text{delayMs} = \max(0, \text{scheduledAt} - \text{Date.now()})$$
BullMQ stores delayed jobs inside Redis sorted sets (`ZSET`). Redis automatically promotes delayed jobs to the active queue at the exact millisecond without CPU polling.

### 2. How Persistence on Restart is Handled
When the backend container or process restarts, the server runs `recoverPendingJobs()` on startup:
1. Queries PostgreSQL for records with status `PENDING` or `RESCHEDULED` where `sentAt` is `null`.
2. Checks whether the job already exists in BullMQ via `emailQueue.getJob(job.id)`.
3. If missing, calculates the remaining delay (or `0` if past due) and re-enqueues it with the original database UUID as the `jobId`.

### 3. How Rate Limiting & Concurrency are Implemented
- **Key Pattern:** `ratelimit:{senderId}:{YYYY-MM-DD-HH}`
- **Atomic Operations:** Uses Redis `INCR` with a 1-hour TTL (3660s buffer).
- **Rescheduling Logic:** If the counter exceeds the sender's configured `maxPerHour`, the remaining milliseconds until the next clock hour are calculated, and the BullMQ job is delayed to the next window with status updated to `RESCHEDULED`.
- **Alert Dispatch:** Triggers `notifyRateLimitReached()` to send a real-time alert to the user's connected Slack channel.
- **Worker Concurrency:** Configured on the BullMQ `Worker` instance (`concurrency: 5`), allowing parallel execution while strictly respecting per-sender throttling.

---

## 📧 Ethereal Email & Environment Variables Setup

### How Ethereal Email Works:
The application uses **Nodemailer** with **Ethereal Email** (fake SMTP service for testing):
- If `ETHEREAL_USER` and `ETHEREAL_PASS` are provided in `.env`, it connects using those credentials.
- Otherwise, it automatically calls `nodemailer.createTestAccount()` on first send and prints the live preview URL to the console:
  `🔗 Preview URL: https://ethereal.email/message/...`
- Includes resilient cloud sandbox fallback for cloud hosts where outbound SMTP ports are restricted.

### Backend Environment Variables (`backend/.env`):
```ini
PORT=5000
DATABASE_URL=postgresql://reachinbox_user:reachinbox_secure_password@localhost:5432/reachinbox_db?schema=public
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_NODE=http://localhost:9200
FRONTEND_URL=http://localhost:3000
WORKER_CONCURRENCY=5
DELAY_BETWEEN_EMAILS_MS=2000
DEFAULT_MAX_PER_HOUR=10
```

### Frontend Environment Variables (`frontend/.env.local`):
```ini
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=644429249211-dbfs7ul318qnniaft4p46nq4d5c1svon.apps.googleusercontent.com
```

---

## 📦 How to Run Locally

### 1. Start Infrastructure Containers
Run the Docker stack (PostgreSQL 5432, Redis 6379, and Elasticsearch 9200):
```bash
docker compose up -d
```

### 2. Run Backend (Express, Redis, DB, BullMQ Worker)
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```
Backend runs on `http://localhost:5000` with Bull-Board mounted at `http://localhost:5000/admin/queues`.

### 3. Run Frontend (Next.js)
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

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
4. **Server Restart Resilience Scenario**:
   - Open backend terminal and stop the server (`Ctrl+C`).
   - Show that jobs in PostgreSQL remain safe.
   - Restart the server (`npm run dev`) and show the terminal log:
     `[Recovery] Scanning database for uncompleted jobs...`
     `[Recovery] Re-enqueued job ...`
   - Show the email reaching its target time and sending automatically without cron!
5. **Rate Limiting & Delay Under Load**:
   - Demonstrate sender hourly rate limit hit.
   - Show terminal log:
     `[RateLimit] Limit reached for sender... Rescheduling job to next hour window.`
     `[Slack Alert Delivered] ⚠️ Hourly Email Limit Reached`
   - Show job status transitioning to `RESCHEDULED` in database and Elasticsearch.
6. **Elasticsearch Full-Text Search**:
   - In the search bar on the dashboard, type keywords (e.g. `alex` or subject keyword) to show instant fuzzy search across recipient, subject, and body.
