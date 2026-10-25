import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-queue';

export interface EmailJobData {
  jobId: string; // References the EmailJob ID in PostgreSQL
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

/**
 * Adds an email job to the BullMQ delayed queue.
 * Passing jobId = data.jobId guarantees deduplication.
 */
export async function addEmailJob(data: EmailJobData, delayMs: number = 0) {
  return await emailQueue.add('send-email', data, {
    jobId: data.jobId,
    delay: Math.max(0, delayMs),
  });
}
