import { Router } from 'express';
import { searchEmailsHandler } from '../controllers/search.controller';

const router = Router();

// GET /api/emails/search
router.get('/search', searchEmailsHandler);

export default router;
