import { Resend } from 'resend';

export interface SessionEmailDetails {
  studentEmail: string;
  studentName: string;
  tutorName: string;
  topic: string;
  scheduledAt: string;
  durationMinutes?: number;
  meetingLink?: string;
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
        ${details.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${details.meetingLink}">${details.meetingLink}</a></p>` : ''}
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

export interface SessionStartedEmailDetails {
  studentEmail: string;
  studentName: string;
  tutorName: string;
  topic: string;
  meetingLink?: string;
}

/**
 * Sends a live session notification email via Resend SDK when a session starts (in_progress).
 * Wrap in try/catch so failure NEVER blocks session status updates.
 */
export async function sendSessionStartedEmail(details: SessionStartedEmailDetails): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  const subject = `🔴 Session Started: ${details.topic} with ${details.tutorName}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #4f46e5;">Hi ${details.studentName},</h2>
      <p>Your 1-on-1 tutoring session on <strong>"${details.topic}"</strong> with <strong>${details.tutorName}</strong> is now live!</p>
      <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; padding: 16px; border-radius: 12px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">🔴 In Progress</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Topic:</strong> ${details.topic}</p>
        ${details.meetingLink ? `<p style="margin: 12px 0 0 0;"><a href="${details.meetingLink}" style="display: inline-block; background-color: #16a34a; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Join Video Call Now →</a></p>` : ''}
      </div>
      <p>Log in to your Student Dashboard to join the live session workspace and follow along with notes!</p>
      <br/>
      <p>Best regards,<br/>The TutorFlow Team</p>
    </div>
  `;

  if (!apiKey || apiKey.startsWith('dummy') || apiKey.includes('your-resend')) {
    console.log('[Resend Session Started Email Logged (Simulated mode)]', { to: details.studentEmail, subject });
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
      console.warn('[Resend Session Started Email Non-Blocking Error]', error);
      return false;
    }

    console.log('[Resend Session Started Email Dispatched Successfully]', data?.id);
    return true;
  } catch (err) {
    console.warn('[Resend Session Started Email Exception Handled]', err);
    return false;
  }
}
