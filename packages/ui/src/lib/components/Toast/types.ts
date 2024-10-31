import type { HTMLBaseAttributes } from 'svelte/elements';
export type ToastData = {
  title: string;
  body: string;
  type: 'success' | 'danger' | 'info';
} & HTMLBaseAttributes;
