export type JobStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RESCHEDULED';

export interface User {
  id?: string;
  name: string;
  email: string;
  picture?: string;
}

export interface EmailJob {
  id: string;
  userId?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: JobStatus;
  scheduledAt: string;
  sentAt?: string | null;
  delaySeconds?: number;
  retryCount?: number;
  createdAt: string;
}

export interface SchedulePayload {
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delaySeconds: number;
  hourlyLimit?: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export interface SlackStatus {
  connected: boolean;
  channel?: string | null;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}
