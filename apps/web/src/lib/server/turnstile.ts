const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifies a Turnstile token with Cloudflare. Fails closed: any network or
 * parsing error is treated as a failed verification.
 */
export const verifyTurnstileToken = async (token: string | undefined): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!token || !secret) return false;

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token })
    });
    const result = (await response.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!result.success) {
      console.warn('Turnstile verification failed', result['error-codes']);
    }
    return result.success;
  } catch (error) {
    console.error('Turnstile verification request failed', error);
    return false;
  }
};
