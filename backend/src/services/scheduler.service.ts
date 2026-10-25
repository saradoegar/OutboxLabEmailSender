import { prisma } from '../config/db';
import { addEmailJob, emailQueue } from '../queues/email.queue';
import { indexEmail } from './search.service';
import { EmailJob } from '@prisma/client';

export interface ScheduleEmailPayload {
  userId?: string;
  userEmail?: string;
  userName?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string | Date;
  delaySeconds?: number;
}

/**
 * Robust user resolver: guarantees a valid PostgreSQL User record ID to prevent foreign key errors.
 */
async function resolveValidUserId(payload: ScheduleEmailPayload): Promise<string> {
  // 1. If a userId was passed, check if it actually exists in the PostgreSQL User table
  if (payload.userId) {
    const existingById = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (existingById) return existingById.id;
  }

  // 2. If a userEmail was passed (e.g. from Google login like rrosecatlove@gmail.com), upsert in DB
  const rawEmail = (payload.userEmail || '').trim().toLowerCase();
  if (rawEmail) {
    const upsertedUser = await prisma.user.upsert({
      where: { email: rawEmail },
      update: {
        name: payload.userName || rawEmail.split('@')[0],
      },
      create: {
        email: rawEmail,
        name: payload.userName || rawEmail.split('@')[0],
      },
    });
    return upsertedUser.id;
  }

  // 3. Fallback: check if any user exists in the database
  const firstUser = await prisma.user.findFirst();
  if (firstUser) return firstUser.id;

  // 4. Create default fallback user
  const defaultUser = await prisma.user.create({
    data: {
      email: 'demo@reachinbox.ai',
      name: 'ReachInbox Demo User',
    },
  });
  return defaultUser.id;
}

/**
 * Schedules an email job by writing to PostgreSQL, indexing in Elasticsearch, and enqueuing to BullMQ with delay.
 */
export async function scheduleEmail(payload: ScheduleEmailPayload): Promise<EmailJob> {
  // Resolve valid foreign key user ID
  const validUserId = await resolveValidUserId(payload);
  const scheduledDate = new Date(payload.scheduledAt);
  const delaySeconds = payload.delaySeconds !== undefined ? Number(payload.delaySeconds) : 2;

  // 1. Create the EmailJob record in PostgreSQL
  const emailJob = await prisma.emailJob.create({
    data: {
      userId: validUserId,
      recipientEmail: payload.recipientEmail,
      subject: payload.subject,
      body: payload.body,
      status: 'PENDING',
      scheduledAt: scheduledDate,
      delaySeconds,
    },
  });

  // 2. Sync to Elasticsearch for real-time search
  await indexEmail(emailJob);

  // 3. Calculate delay in milliseconds
  const delayMs = Math.max(0, scheduledDate.getTime() - Date.now());

  // 4. Add to BullMQ with jobId = emailJob.id for deduplication
  await addEmailJob({ jobId: emailJob.id }, delayMs);

  console.log(`[Scheduler] Enqueued job ${emailJob.id} for ${scheduledDate.toISOString()} (delay: ${delayMs}ms)`);
  return emailJob;
}

/**
 * Startup recovery: Re-queues any past-due or pending jobs that are not currently in BullMQ.
 */
export async function recoverPendingJobs(): Promise<void> {
  console.log('[Recovery] Scanning database for uncompleted jobs...');

  const pendingJobs = await prisma.emailJob.findMany({
    where: {
      status: { in: ['PENDING', 'RESCHEDULED'] },
      sentAt: null,
    },
    orderBy: { scheduledAt: 'asc' },
  });

  if (pendingJobs.length === 0) {
    console.log('[Recovery] No pending jobs found.');
    return;
  }

  console.log(`[Recovery] Found ${pendingJobs.length} pending jobs in database. Verifying queue state...`);
  let reEnqueuedCount = 0;

  for (const job of pendingJobs) {
    const existingJob = await emailQueue.getJob(job.id);

    // If job does not exist in BullMQ, re-enqueue it
    if (!existingJob) {
      const delayMs = Math.max(0, job.scheduledAt.getTime() - Date.now());
      await addEmailJob({ jobId: job.id }, delayMs);
      reEnqueuedCount++;
      console.log(`[Recovery] Re-enqueued job ${job.id} (remaining delay: ${delayMs}ms)`);
    }
  }

  console.log(`[Recovery] Completed. Successfully re-queued ${reEnqueuedCount} jobs.`);
}
