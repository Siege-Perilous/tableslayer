import type { CreateSelectProps } from '@melt-ui/svelte';

export type SelectProps = CreateSelectProps & {
  options: Record<string, string[]> | string[];
};
