import { Resend } from 'resend';

export interface SessionEmailDetails {
  studentEmail: string;
  studentName: string;
  tutorName: string;
  topic: string;
  scheduledAt: string;
  durationMinutes?: number;
}

/**
 * Sends a session confirmation email via Resend SDK.
 * Wrap in try/catch so failure NEVER blocks or rolls back session creation.
 */
export async function sendSessionScheduledEmail(details: SessionEmailDetails): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  const formattedDate = new Date(details.scheduledAt).toLocaleString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `New 1-on-1 Tutoring Session Scheduled: ${details.topic}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
      <h2>Hi ${details.studentName},</h2>
      <p>A new 1-on-1 tutoring session has been scheduled with <strong>${details.tutorName}</strong>.</p>
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p><strong>Topic:</strong> ${details.topic}</p>
        <p><strong>Date & Time:</strong> ${formattedDate}</p>
        <p><strong>Duration:</strong> ${details.durationMinutes || 60} minutes</p>
      </div>
      <p>Log in to your Student Dashboard to prepare for your session!</p>
      <br/>
      <p>Best regards,<br/>The TutorFlow Team</p>
    </div>
  `;

  if (!apiKey || apiKey.startsWith('dummy') || apiKey.includes('your-resend')) {
    console.log('[Resend Email Logged (Simulated mode)]', { to: details.studentEmail, subject });
    return true;
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: 'TutorFlow <onboarding@resend.dev>',
      to: [details.studentEmail],
      subject,
      html,
    });

    if (error) {
      console.warn('[Resend Email Non-Blocking Error]', error);
      return false;
    }

    console.log('[Resend Email Dispatched Successfully]', data?.id);
    return true;
  } catch (err) {
    console.warn('[Resend Email Exception Handled]', err);
    return false;
  }
}
