import {
  createOrUpdateGoogleUser,
  createSession,
  generateSessionToken,
  google,
  isGoogleOAuthEnabled,
  setSessionTokenCookie
} from '$lib/server';
import type { RequestEvent } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import type { OAuth2Tokens } from 'arctic';

export async function GET(event: RequestEvent): Promise<Response> {
  if (!isGoogleOAuthEnabled()) {
    throw error(404, 'Google OAuth is not configured on this server');
  }

  const code = event.url.searchParams.get('code');
  const state = event.url.searchParams.get('state');
  const storedState = event.cookies.get('google_oauth_state') ?? null;
  const codeVerifier = event.cookies.get('google_code_verifier') ?? null;

  // Clean up cookies
  event.cookies.delete('google_oauth_state', { path: '/' });
  event.cookies.delete('google_code_verifier', { path: '/' });

  // Verify state parameter
  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return new Response('Invalid request', {
      status: 400
    });
  }

  try {
    // Exchange authorization code for tokens
    const tokens: OAuth2Tokens = await google.validateAuthorizationCode(code, codeVerifier);

    // Get access token
    const accessToken = tokens.accessToken();

    // Fetch user info from Google
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const googleUser = (await response.json()) as {
      sub: string;
      email: string;
      name?: string;
      given_name?: string;
      picture?: string;
    };

    // Extract user information
    const googleUserId = googleUser.sub;
    const email = googleUser.email;
    const name = googleUser.name || googleUser.given_name || email.split('@')[0];
    const avatarUrl = googleUser.picture;

    // Create or update user in our database
    const user = await createOrUpdateGoogleUser(googleUserId, email, name, avatarUrl);

    // Create session
    const token = generateSessionToken();
    await createSession(token, user.id);
    setSessionTokenCookie(event, token);

    // Check for redirect cookie
    const redirectUrl = event.cookies.get('redirect_after_login');
    if (redirectUrl) {
      // Clear the redirect cookie
      event.cookies.delete('redirect_after_login', { path: '/' });
      return redirect(302, redirectUrl);
    }

    // Redirect to home page
    return redirect(302, '/');
  } catch (e) {
    console.error('OAuth error:', e);
    // Redirect to login with error
    return redirect(302, '/login?error=oauth_failed');
  }
}
