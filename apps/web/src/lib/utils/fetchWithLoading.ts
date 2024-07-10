import { delayedLoading, startLoading, stopLoading } from '$lib/stores/loading';

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithLoading(url: string, options?: RequestInit) {
  startLoading();
  let delayedLoadingTimeout: NodeJS.Timeout;

  try {
    delayedLoadingTimeout = setTimeout(() => {
      delayedLoading.set(true);
    }, 1000); // Show delayed loading state after 1 second

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();

    clearTimeout(delayedLoadingTimeout);
    delayedLoading.set(false);
    return data;
  } finally {
    stopLoading();
    delayedLoading.set(false);
  }
}
