import { describe, expect, it } from 'vitest';

describe('PartyKit Server Health Check', () => {
  it('should verify PartyKit host is configured', () => {
    const partykitHost = process.env.PUBLIC_PARTYKIT_HOST;

    // In CI, we should always have this configured
    if (process.env.CI) {
      expect(partykitHost).toBeDefined();
      expect(partykitHost).not.toBe('');

      // For PR deployments, should match pattern pr-{number}.tableslayer.com
      if (process.env.GITHUB_PR_NUMBER && process.env.GITHUB_PR_NUMBER !== '0') {
        expect(partykitHost).toMatch(/^pr-\d+\.tableslayer\.com$/);
      } else {
        // For production deployment, should be partykit.tableslayer.com
        expect(partykitHost).toBe('partykit.tableslayer.com');
      }
    }
  });

  it('should be able to reach PartyKit server', async () => {
    // Skip in local development if PartyKit host is localhost
    const partykitHost = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';
    if (partykitHost.includes('localhost') && !process.env.CI) {
      console.log('Skipping PartyKit server check in local development');
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

      // PartyKit servers typically return a 404 or 426 (Upgrade Required) for non-WebSocket requests
      // but the fact we get a response means the server is running
      expect([200, 404, 426]).toContain(response.status);
      console.log(`PartyKit server responded with status: ${response.status}`);
    } catch (error) {
      // Network errors mean server is not reachable
      throw new Error(`Failed to reach PartyKit server at ${healthUrl}: ${error}`);
    }
  }, 15000); // 15 second timeout for the test
});
