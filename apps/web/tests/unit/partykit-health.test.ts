import { describe, expect, it } from 'vitest';

describe('Realtime worker health check', () => {
  it('should verify the realtime host is configured', () => {
    const partykitHost = process.env.PUBLIC_PARTYKIT_HOST;

    // In CI, we should always have this configured
    if (process.env.CI) {
      expect(partykitHost).toBeDefined();
      expect(partykitHost).not.toBe('');

      // For PR deployments, should be the preview worker's workers.dev host
      if (process.env.GITHUB_PR_NUMBER && process.env.GITHUB_PR_NUMBER !== '0') {
        expect(partykitHost).toMatch(/^tableslayer-realtime-pr-\d+\.[\w-]+\.workers\.dev$/);
      } else {
        // For production deployment, should be partykit.tableslayer.com
        expect(partykitHost).toBe('partykit.tableslayer.com');
      }
    }
  });

  it('should be able to reach the realtime worker', async () => {
    // Skip in local development if PartyKit host is localhost
    const partykitHost = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';
    if (partykitHost.includes('localhost') && !process.env.CI) {
      console.log('Skipping realtime worker check in local development');
      return;
    }

    // Only run this test in CI
    if (!process.env.CI) {
      return;
    }

    const protocol = partykitHost.includes('localhost') ? 'http' : 'https';
    const healthUrl = `${protocol}://${partykitHost}/`;

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      // The worker returns 404 for non-room paths; any response means it is running
      expect([200, 404, 426]).toContain(response.status);
      console.log(`Realtime worker responded with status: ${response.status}`);
    } catch (error) {
      // Network errors mean server is not reachable
      throw new Error(`Failed to reach realtime worker at ${healthUrl}: ${error}`);
    }
  }, 15000); // 15 second timeout for the test
});
