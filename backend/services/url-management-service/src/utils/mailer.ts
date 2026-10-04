import sgMail from '@sendgrid/mail';
import { config } from '../config.js';

sgMail.setApiKey(config.sendgridApiKey);

export interface MailOptions {
    to: string;
    subject: string;
    html: string;
    /** Fallback plain-text body (auto-stripped from html when omitted) */
    text?: string;
}

/**
 * Send a transactional email via SendGrid.
 * Throws on non-2xx responses so callers can handle delivery failures.
 */
export async function sendMail({ to, subject, html, text }: MailOptions): Promise<void> {
    await sgMail.send({
        to,
        from: {
            email: config.emailFrom,
            name: config.emailFromName,
        },
        subject,
        html,
        ...(text ? { text } : {}),
    });
}

// ── Pre-built templates ────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
    await sendMail({
        to,
        subject: 'Verify your FastUrl email address',
        text: `Click the link below to verify your email address:\n\n${verificationUrl}\n\nThis link expires in 24 hours. If you did not sign up for FastUrl, you can safely ignore this email.`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="background:#111;padding:24px 32px;">
          <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">FastUrl</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#111;">Verify your email address</h1>
          <p style="margin:0 0 24px;color:#555;line-height:1.6;">
            Thanks for signing up! Click the button below to confirm your email and activate your account.
          </p>
          <a href="${verificationUrl}"
             style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
            Verify email
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.6;">
            This link expires in <strong>24 hours</strong>. If you didn't create a FastUrl account, ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
}
