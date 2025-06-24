import { dev } from '$app/environment';
import { Google } from 'arctic';

const redirectUri = dev
  ? 'http://localhost:5174/login/google/callback'
  : process.env.BASE_URL
    ? `${process.env.BASE_URL}/login/google/callback`
    : 'https://tableslayer.com/login/google/callback';

export const google = new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, redirectUri);
