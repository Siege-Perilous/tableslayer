import type { CreateSelectProps } from '@melt-ui/svelte';
import type { ListboxOption } from '@melt-ui/svelte/dist/builders/listbox/types';

export type SelectProps = CreateSelectProps & {
  options: Record<string, ListboxOption[]> | ListboxOption[];
  variant?: 'default' | 'transparent';
};
