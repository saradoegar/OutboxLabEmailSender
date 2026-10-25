import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { sendEmail } from '../services/mailer.service';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from '../queues/email.queue';
import { checkAndIncrementRateLimit } from '../services/rateLimiter.service';
import { notifyRateLimitReached } from '../services/slack.service';
import { indexEmail } from '../services/search.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Initializes and starts the BullMQ worker for the email queue.
 */
export function initEmailWorker(): Worker<EmailJobData> {
  const concurrency = Number(process.env.WORKER_CONCURRENCY) || 5;

  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { jobId } = job.data;
      console.log(`[Worker] Picked up job ID: ${jobId}`);

      // 1. Fetch job from PostgreSQL
      const emailJob = await prisma.emailJob.findUnique({
        where: { id: jobId },
        include: { senderAccount: true },
      });

      if (!emailJob) {
        console.warn(`[Worker] Job ${jobId} not found in database. Skipping.`);
        return;
      }

      // Idempotency check: Skip if already marked as SENT
      if (emailJob.status === 'SENT') {
        console.log(`[Worker] Job ${jobId} was already sent. Skipping duplicate send.`);
        return;
      }

      // 2. Resolve sender account details
      let sender = emailJob.senderAccount;
      if (!sender) {
        sender = await prisma.senderAccount.findFirst();
        if (!sender) {
          sender = await prisma.senderAccount.create({
            data: {
              email: process.env.EMAIL_FROM_ADDRESS || 'scheduler@reachinbox.ai',
              etherealUser: 'ethereal_user',
              etherealPass: 'ethereal_pass',
              maxPerHour: Number(process.env.DEFAULT_MAX_PER_HOUR) || 10,
            },
          });
        }
      }

      const senderId = sender.id;
      const senderEmail = sender.email;
      const maxPerHour = sender.maxPerHour;

      // 3. Distributed Redis Rate Limiting Check
      const rateCheck = await checkAndIncrementRateLimit(senderId, maxPerHour);

      if (!rateCheck.allowed) {
        console.warn(
          `[Worker] Sender ${senderEmail} hit hourly limit (${maxPerHour}/hr). Rescheduling job ${jobId} to next hour window (+${Math.round(
            rateCheck.nextAvailableWindowMs / 1000
          )}s).`
        );

        // Notify user via Slack (gracefully skips if Slack not linked)
        await notifyRateLimitReached(emailJob.userId, senderEmail, maxPerHour);

        // Update database record to RESCHEDULED with new target time
        const nextTargetTime = new Date(Date.now() + rateCheck.nextAvailableWindowMs);
        const rescheduledJob = await prisma.emailJob.update({
          where: { id: jobId },
          data: {
            status: 'RESCHEDULED',
            scheduledAt: nextTargetTime,
          },
        });

        // Sync updated status to Elasticsearch
        await indexEmail(rescheduledJob);

        // Re-enqueue job in BullMQ with delay until the next hour window
        await emailQueue.add(
          'send-email',
          { jobId: emailJob.id },
          {
            jobId: `${emailJob.id}_rescheduled_${Date.now()}`,
            delay: rateCheck.nextAvailableWindowMs,
          }
        );

        // Return early without sending the email
        return;
      }

      // 4. Simulated provider throttling / rate limit delay
      const throttleMs =
        Number(process.env.DELAY_BETWEEN_EMAILS_MS) ||
        emailJob.delaySeconds * 1000 ||
        2000;

      if (throttleMs > 0) {
        console.log(`[Worker] Throttling for ${throttleMs}ms before sending job ${jobId}...`);
        await sleep(throttleMs);
      }

      try {
        // 5. Send email via Nodemailer
        const mailResult = await sendEmail({
          to: emailJob.recipientEmail,
          subject: emailJob.subject,
          body: emailJob.body,
        });

        // 6. Update status in PostgreSQL to SENT
        const sentJob = await prisma.emailJob.update({
          where: { id: jobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        // Sync SENT status to Elasticsearch
        await indexEmail(sentJob);

        console.log(`[Worker] Successfully delivered job ${jobId}. Message ID: ${mailResult.messageId}`);
      } catch (error) {
        // 7. On error: mark FAILED, increment retry count, and sync to Elasticsearch
        console.error(`[Worker] Error sending email for job ${jobId}:`, error);

        const failedJob = await prisma.emailJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            retryCount: { increment: 1 },
          },
        });

        await indexEmail(failedJob);

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] BullMQ job ${job.id} completed.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] BullMQ job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
