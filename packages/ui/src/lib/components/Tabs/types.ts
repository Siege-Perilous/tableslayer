import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

export type Tab = {
  id: string;
  label: string;
  /** A Tabler icon component, shown before the label. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  /** Makes the tab a link: choosing it goes there, and the page it leads to says which tab is selected. */
  href?: string;
  /** A small count or note after the label. */
  badge?: string | number;
  isDisabled?: boolean;
};

export type TabsProps = {
  tabs: Tab[];
  /** The id of the tab that is selected. */
  selected: string;
  onSelectedChange?: (selected: string) => void;
  variant?: 'underline' | 'segmented';
  size?: 'sm' | 'md';
  /** What the selected tab shows. Left out, the tabs are a row to switch with and nothing more. */
  children?: Snippet<[{ selected: string }]>;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;
