import axios from 'axios';
import { EmailJob, SchedulePayload, SlackStatus } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch pending / rescheduled email jobs
 */
export async function getScheduledEmails(): Promise<EmailJob[]> {
  const res = await api.get<{ success: boolean; data: EmailJob[] }>('/api/emails/scheduled');
  return res.data.data;
}

/**
 * Fetch sent / failed email jobs
 */
export async function getSentEmails(): Promise<EmailJob[]> {
  const res = await api.get<{ success: boolean; data: EmailJob[] }>('/api/emails/sent');
  return res.data.data;
}

/**
 * Full-text search emails via Elasticsearch endpoint
 */
export async function searchEmails(query: string, status?: string): Promise<EmailJob[]> {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (status && status !== 'ALL') params.append('status', status);

  const res = await api.get<{ success: boolean; data: EmailJob[] }>(`/api/emails/search?${params.toString()}`);
  return res.data.data;
}

/**
 * Schedule batch of emails with staggered timestamps according to delaySeconds
 */
export async function scheduleEmailBatch(data: SchedulePayload): Promise<EmailJob[]> {
  const results: EmailJob[] = [];
  const baseTime = new Date(data.scheduledAt).getTime();
  const delayBetweenMs = (data.delaySeconds || 2) * 1000;

  for (let i = 0; i < data.recipients.length; i++) {
    const recipientEmail = data.recipients[i];
    // Slightly stagger scheduledAt by delaySeconds if scheduling multiple leads
    const targetTimestamp = new Date(baseTime + i * delayBetweenMs).toISOString();

    const res = await api.post<{ success: boolean; data: EmailJob }>('/api/emails/schedule', {
      recipientEmail,
      subject: data.subject,
      body: data.body,
      scheduledAt: targetTimestamp,
      delaySeconds: data.delaySeconds,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
    });

    results.push(res.data.data);
  }

  return results;
}

/**
 * Check user Slack connection status
 */
export async function getSlackStatus(userId?: string, userEmail?: string): Promise<SlackStatus> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (userEmail) params.append('userEmail', userEmail);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await api.get<{ success: boolean; connected: boolean; channel?: string }>(`/api/slack/status${query}`);
  return {
    connected: res.data.connected,
    channel: res.data.channel,
  };
}

/**
 * Disconnect Slack integration
 */
export async function disconnectSlack(userId?: string, userEmail?: string): Promise<void> {
  await api.post('/api/slack/disconnect', { userId, userEmail });
}
