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
  const recipient = dev ? process.env.DEV_EMAIL! : to;
  console.log('Sending email to', recipient, 'from', from);
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
