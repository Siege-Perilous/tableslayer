import { startDelayedLoading, startLoading, stopDelayedLoading, stopLoading } from '$lib/stores/loading';
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithLoading(url: string, key: string, options?: RequestInit) {
  startLoading(key);
  startDelayedLoading(key);
  try {
    await delay(2000); // Simulate a 2-second delay for testing purposes

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();

    return data;
  } finally {
    stopLoading(key);
    stopDelayedLoading(key);
  }
}
