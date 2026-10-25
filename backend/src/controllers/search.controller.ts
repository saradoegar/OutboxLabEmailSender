import { Request, Response } from 'express';
import { searchEmails } from '../services/search.service';

/**
 * GET /api/emails/search
 * Query parameters:
 *   - q: search keyword for recipientEmail, subject, or body
 *   - status: optional filter (PENDING, SENT, RESCHEDULED, FAILED, ALL)
 *   - userId: optional filter by user
 */
export async function searchEmailsHandler(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query.q as string | undefined;
    const status = req.query.status as string | undefined;
    const userId = req.query.userId as string | undefined;

    const results = await searchEmails(userId, query, status);

    res.json({
      success: true,
      count: results.length,
      query: query || '',
      statusFilter: status || 'ALL',
      data: results,
    });
  } catch (error) {
    console.error('[Controller] searchEmails error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal search error',
    });
  }
}
