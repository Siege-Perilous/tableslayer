import { derived, writable } from 'svelte/store';

export const loadingMap = writable<Map<string, boolean>>(new Map());
export const delayedLoadingMap = writable<Map<string, boolean>>(new Map());

export const startLoading = (key: string) => {
  loadingMap.update((map) => map.set(key, true));
};

export const stopLoading = (key: string) => {
  loadingMap.update((map) => map.set(key, false));
};

export const startDelayedLoading = (key: string) => {
  setTimeout(() => {
    loadingMap.subscribe((map) => {
      if (map.get(key)) {
        delayedLoadingMap.update((map) => map.set(key, true));
      }
    });
  }, 1000);
};

export const stopDelayedLoading = (key: string) => {
  delayedLoadingMap.update((map) => map.set(key, false));
};

// Derived store to check if any loading is active
export const isAnyLoading = derived([loadingMap, delayedLoadingMap], ([$loadingMap, $delayedLoadingMap]) => {
  for (const loading of $loadingMap.values()) {
    if (loading) return true;
  }
  for (const delayedLoading of $delayedLoadingMap.values()) {
    if (delayedLoading) return true;
  }
  return false;
});
