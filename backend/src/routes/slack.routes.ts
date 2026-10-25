import { Router } from 'express';
import {
  startSlackOAuthHandler,
  slackOAuthCallbackHandler,
  disconnectSlackHandler,
  getSlackStatusHandler,
  setSlackWebhookHandler,
} from '../controllers/slack.controller';

const router = Router();

// Slack OAuth Start & Callback
router.get('/oauth/start', startSlackOAuthHandler);
router.get('/oauth/callback', slackOAuthCallbackHandler);

// Connection management
router.get('/status', getSlackStatusHandler);
router.post('/disconnect', disconnectSlackHandler);
router.post('/webhook', setSlackWebhookHandler);

export default router;
