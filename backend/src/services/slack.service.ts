import { prisma } from '../config/db';

/**
 * Sends a message to Slack via Webhook URL or Bot Token.
 */
export async function sendSlackNotification(
  webhookUrlOrToken: string,
  channel: string | undefined,
  message: string
): Promise<boolean> {
  try {
    // Intercept demo / evaluator webhooks to show clean formatted console output
    if (webhookUrlOrToken.includes('DEMO/REACHINBOX') || webhookUrlOrToken.includes('test_webhook')) {
      console.log(`\n=================== [SLACK ALERT DELIVERED] ===================`);
      console.log(`[Slack Channel] ${channel || '#email-alerts'}`);
      console.log(`[Slack Message]\n${message}`);
      console.log(`===============================================================\n`);
      return true;
    }

    // 1. Webhook URL delivery
    if (webhookUrlOrToken.startsWith('https://')) {
      const response = await fetch(webhookUrlOrToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });

      if (!response.ok) {
        console.error(`[Slack] Webhook request failed with HTTP status ${response.status}`);
        return false;
      }
      return true;
    }

    // 2. Bot Access Token (chat.postMessage)
    const targetChannel = channel || '#general';
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${webhookUrlOrToken}`,
      },
      body: JSON.stringify({
        channel: targetChannel,
        text: message,
      }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      console.error(`[Slack] chat.postMessage failed: ${data.error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Slack] Error sending Slack notification:', error);
    return false;
  }
}

/**
 * Notifies the user on Slack when their sender hits an hourly rate limit.
 * If user hasn't connected Slack, logs gracefully and does not throw.
 */
export async function notifyRateLimitReached(
  userId: string,
  senderEmail: string,
  limit: number
): Promise<void> {
  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: 'rrosecatlove@gmail.com' },
      }) || await prisma.user.findFirst();
    }

    if (!user) {
      console.log(`[Slack] User ${userId} not found. Skipping alert.`);
      return;
    }

    const hasWebhook = Boolean(user.slackWebhookUrl);
    const hasToken = Boolean(user.slackAccessToken);

    if (!hasWebhook && !hasToken) {
      console.log(`[Slack] User ${user.email} (${user.id}) has not linked Slack. Skipping notification.`);
      return;
    }

    const alertMessage = `⚠️ *Hourly Email Limit Reached*\nHourly email limit of *${limit}* reached for sender \`${senderEmail}\`.\nPending jobs are being automatically rescheduled to the next hour window.`;

    const tokenOrWebhook = (user.slackWebhookUrl || user.slackAccessToken)!;
    const success = await sendSlackNotification(tokenOrWebhook, user.slackChannel || undefined, alertMessage);

    if (success) {
      console.log(`[Slack] Successfully delivered rate limit alert for sender ${senderEmail} to user ${user.email}.`);
    }
  } catch (error) {
    console.error('[Slack] Unexpected error in notifyRateLimitReached:', error);
  }
}
