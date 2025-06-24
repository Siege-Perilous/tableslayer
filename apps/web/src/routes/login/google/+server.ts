import { google } from '$lib/server';
import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { generateCodeVerifier, generateState } from 'arctic';

export async function GET(event: RequestEvent): Promise<Response> {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  // Create authorization URL with required scopes
  const scopes = ['openid', 'profile', 'email'];
  const url = google.createAuthorizationURL(state, codeVerifier, scopes);

  // Store state and code verifier in cookies
  event.cookies.set('google_oauth_state', state, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    sameSite: 'lax'
  });

  event.cookies.set('google_code_verifier', codeVerifier, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    sameSite: 'lax'
  });

  return redirect(302, url.toString());
}
