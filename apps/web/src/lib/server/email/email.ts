import { dev } from '$app/environment';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendSingleEmail = async ({ from = 'no-reply@tableslayer.com', to, subject, html }: EmailOptions) => {
  if (!process.env.CLOUDFLARE_EMAIL_API_KEY || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('CLOUDFLARE_EMAIL_API_KEY or CLOUDFLARE_ACCOUNT_ID is not set');
    return;
  }
  if (process.env.ENV_NAME === 'preview') {
    console.log('PR preview, not sending email');
    return;
  }
  const recipient = dev ? process.env.DEV_EMAIL! : to;
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/email/sending/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_EMAIL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: recipient,
          from: { address: from, name: 'Table Slayer' },
          subject,
          html,
          text: html
        })
      }
    );
    if (!response.ok) {
      console.error('Error sending email:', await response.text());
    }
  } catch (e) {
    console.error('Error sending email:', e);
  }
};
