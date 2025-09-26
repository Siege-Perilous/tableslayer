import { dev } from '$app/environment';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_TOKEN!);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendSingleEmail = async ({ from = 'no-reply@tableslayer.com', to, subject, html }: EmailOptions) => {
  if (!process.env.RESEND_TOKEN) {
    console.error('RESEND_TOKEN is not set');
    return;
  }
  if (process.env.ENV_NAME === 'preview') {
    console.log('PR preview, not sending email');
    return;
  }
  const recipient = dev ? process.env.DEV_EMAIL! : to;
  try {
    await resend.emails.send({
      from,
      to: recipient,
      subject,
      html
    });
  } catch (e) {
    console.error('Error sending email:', e);
  }
};

export const addEmailtoAudience = async (email: string) => {
  try {
    await resend.contacts.create({
      email,
      audienceId: process.env.RESEND_AUDIENCE_ID!,
      unsubscribed: false
    });
  } catch (e) {
    console.error('Error adding email to audience:', e);
  }
};
