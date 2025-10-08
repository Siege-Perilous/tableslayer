import { dev } from '$app/environment';
import { Resend } from 'resend';

let resend: Resend | null = null;

const getResendClient = () => {
  if (!process.env.RESEND_TOKEN) {
    throw new Error('RESEND_TOKEN is not set');
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_TOKEN);
  }
  return resend;
};

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
    const client = getResendClient();
    await client.emails.send({
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
  if (!process.env.RESEND_TOKEN) {
    console.error('RESEND_TOKEN is not set');
    return;
  }
  try {
    const client = getResendClient();
    await client.contacts.create({
      email,
      audienceId: process.env.RESEND_AUDIENCE_ID!,
      unsubscribed: false
    });
  } catch (e) {
    console.error('Error adding email to audience:', e);
  }
};
