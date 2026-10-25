import { Router } from 'express';
import {
  scheduleEmailHandler,
  getScheduledEmailsHandler,
  getSentEmailsHandler,
  getEmailByIdHandler,
} from '../controllers/email.controller';
import { searchEmailsHandler } from '../controllers/search.controller';

const router = Router();

// Full-text search endpoint (placed before /:id to prevent route conflicts)
router.get('/search', searchEmailsHandler);

// Schedule an email
router.post('/schedule', scheduleEmailHandler);

// Get list of pending / rescheduled emails
router.get('/scheduled', getScheduledEmailsHandler);

// Get list of sent / failed emails
router.get('/sent', getSentEmailsHandler);

// Get a specific email job by ID
router.get('/:id', getEmailByIdHandler);

export default router;
