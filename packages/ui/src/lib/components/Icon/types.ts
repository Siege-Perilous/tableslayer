import type { SvelteComponent } from 'svelte';
import type { HTMLBaseAttributes } from 'svelte/elements';

export type IconProps = {
  Icon: typeof SvelteComponent;
  size?: number | string;
  color?: string;
  stroke?: number;
} & HTMLBaseAttributes;
