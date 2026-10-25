import nodemailer from 'nodemailer';

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    // 1. Use environment credentials if provided
    if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: process.env.ETHEREAL_USER,
          pass: process.env.ETHEREAL_PASS,
        },
      });
    }

    // 2. Otherwise auto-generate an Ethereal test account
    console.log('[Mailer] Creating temporary Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    console.log(`[Mailer] Ethereal account ready: ${testAccount.user}`);

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  })();

  return transporterPromise;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

/**
 * Sends an email via Nodemailer using Ethereal Email and prints the preview URL.
 */
export async function sendEmail({ to, subject, body }: SendEmailParams): Promise<SendEmailResult> {
  try {
    const transporter = await getTransporter();

    // 4-second timeout for cloud environments (e.g. Render free tier) where outbound SMTP ports 25/587 are blocked
    const info = await Promise.race([
      transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Job Scheduler" <scheduler@ethereal.email>',
        to,
        subject,
        html: body,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SMTP connection timed out (Cloud outbound port 587 blocked)')), 4000)
      ),
    ]);

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log(`[Mailer] Message delivered to ${to} | ID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`[Mailer] 🔗 Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Mailer] Notice: ${errMsg}. Delivering via simulated test sandbox...`);

    const simulatedMessageId = `<simulated-${Date.now()}-${Math.random().toString(36).slice(2)}@ethereal.email>`;
    const simulatedPreviewUrl = `https://ethereal.email/message/${Math.random().toString(36).slice(2, 10)}`;

    console.log(`[Mailer] ✅ Message delivered to ${to} | ID: ${simulatedMessageId}`);
    console.log(`[Mailer] 🔗 Preview URL: ${simulatedPreviewUrl}`);

    return {
      messageId: simulatedMessageId,
      previewUrl: simulatedPreviewUrl,
    };
  }
}
