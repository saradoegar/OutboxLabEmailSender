import { EmailJob } from '@prisma/client';
import { elasticClient, EMAIL_INDEX } from '../config/elasticsearch';
import { prisma } from '../config/db';

export interface IndexedEmailJob {
  id: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  createdAt: Date | string;
}

/**
 * Upserts an EmailJob document into the Elasticsearch 'emails' index.
 */
export async function indexEmail(job: EmailJob): Promise<void> {
  try {
    await elasticClient.index({
      index: EMAIL_INDEX,
      id: job.id,
      document: {
        id: job.id,
        userId: job.userId,
        recipientEmail: job.recipientEmail,
        subject: job.subject,
        body: job.body,
        status: job.status,
        scheduledAt: job.scheduledAt,
        sentAt: job.sentAt,
        createdAt: job.createdAt,
      },
    });

    console.log(`[Elasticsearch] Synced job ${job.id} (Status: ${job.status})`);
  } catch (error) {
    console.error(
      `[Elasticsearch] Could not sync email job ${job.id}:`,
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Searches email jobs using Elasticsearch multi_match query with fuzzy search.
 * Filters by userId (optional) and status (optional).
 * Includes resilient PostgreSQL fallback if Elasticsearch is offline.
 */
export async function searchEmails(
  userId?: string,
  query?: string,
  status?: string
): Promise<IndexedEmailJob[]> {
  try {
    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    // Full-text search across subject, body, and recipientEmail
    if (query && query.trim() !== '') {
      mustClauses.push({
        multi_match: {
          query: query.trim(),
          fields: ['recipientEmail^3', 'subject^2', 'body'],
          fuzziness: 'AUTO',
        },
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // Optional user filter
    if (userId) {
      filterClauses.push({ term: { userId } });
    }

    // Optional status filter
    if (status && status !== 'ALL') {
      filterClauses.push({ term: { status } });
    }

    const response = await elasticClient.search<IndexedEmailJob>({
      index: EMAIL_INDEX,
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses,
        },
      },
      sort: [{ createdAt: { order: 'desc' } }],
    });

    return response.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is IndexedEmailJob => doc !== undefined);
  } catch (error) {
    console.warn(
      '[Elasticsearch] Elasticsearch query unavailable. Falling back gracefully to PostgreSQL query:',
      error instanceof Error ? error.message : error
    );

    // Fallback directly to Prisma database
    const jobs = await prisma.emailJob.findMany({
      where: {
        userId: userId || undefined,
        status: status && status !== 'ALL' ? (status as any) : undefined,
        OR:
          query && query.trim() !== ''
            ? [
                { subject: { contains: query.trim(), mode: 'insensitive' } },
                { body: { contains: query.trim(), mode: 'insensitive' } },
                { recipientEmail: { contains: query.trim(), mode: 'insensitive' } },
              ]
            : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    return jobs;
  }
}
