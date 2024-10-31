import type { HTMLBaseAttributes } from 'svelte/elements';
export type ToastDataProps = {
  title: string;
  body: string;
  type: 'success' | 'danger' | 'info';
} & HTMLBaseAttributes;
