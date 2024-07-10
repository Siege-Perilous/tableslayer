import { writable } from 'svelte/store';

export const loading = writable(false);
export const delayedLoading = writable(false);

export const startLoading = () => {
  loading.set(true);
  setTimeout(() => {
    loading.subscribe((value) => {
      if (value) {
        delayedLoading.set(true);
      }
    });
  }, 1000);
};

export const stopLoading = () => {
  loading.set(false);
  delayedLoading.set(false);
};
