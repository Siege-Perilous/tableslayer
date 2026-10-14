// Server-to-server bridge from realtime rooms to the app's /api/internal endpoints.
// Deployments set BASE_URL (the app's URL) as a Worker var and INTERNAL_API_TOKEN as a
// secret; dev falls back to the local SvelteKit server and the shared dev token.
// APP_API_URL remains as an explicit override.

export interface AppApiEnv {
  BASE_URL?: string;
  APP_API_URL?: string;
  INTERNAL_API_TOKEN?: string;
}

export const internalToken = (env: AppApiEnv) => env.INTERNAL_API_TOKEN ?? 'dev-internal-token';

export const appRequest = async <T>(env: AppApiEnv, path: string, body: unknown): Promise<T> => {
  // 5174 is the web app's pinned dev port (apps/web/vite.config.ts)
  const configured = env.APP_API_URL ?? env.BASE_URL;
  // Tolerate a https://localhost BASE_URL copied from the app's .env
  const base = (configured ?? 'http://localhost:5174').replace(/^https:\/\/(localhost|127\.)/, 'http://$1');

  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': internalToken(env)
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
};
