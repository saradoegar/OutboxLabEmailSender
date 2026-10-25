import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { scheduleEmail } from '../services/scheduler.service';

/**
 * POST /api/emails/schedule
 * Schedules a new email job.
 */
export async function scheduleEmailHandler(req: Request, res: Response): Promise<void> {
  try {
    const { recipientEmail, subject, body, scheduledAt, delaySeconds, userId, userEmail, userName } = req.body;

    if (!recipientEmail || !subject || !body || !scheduledAt) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: recipientEmail, subject, body, scheduledAt',
      });
      return;
    }

    const parsedDate = new Date(scheduledAt);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid scheduledAt format. Please provide a valid ISO date string.',
      });
      return;
    }

    const job = await scheduleEmail({
      userId,
      userEmail,
      userName,
      recipientEmail,
      subject,
      body,
      scheduledAt: parsedDate,
      delaySeconds,
    });

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('[Controller] scheduleEmail error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * GET /api/emails/scheduled
 * Retrieves all jobs with status PENDING or RESCHEDULED.
 */
export async function getScheduledEmailsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const scheduledJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['PENDING', 'RESCHEDULED'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({
      success: true,
      count: scheduledJobs.length,
      data: scheduledJobs,
    });
  } catch (error) {
    console.error('[Controller] getScheduledEmails error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * GET /api/emails/sent
 * Retrieves all jobs with status SENT or FAILED.
 */
export async function getSentEmailsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const sentJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: sentJobs.length,
      data: sentJobs,
    });
  } catch (error) {
    console.error('[Controller] getSentEmails error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * GET /api/emails/:id
 * Retrieves a single job by ID.
 */
export async function getEmailByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const job = await prisma.emailJob.findUnique({
      where: { id },
    });

    if (!job) {
      res.status(404).json({ success: false, error: 'Email job not found' });
      return;
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
