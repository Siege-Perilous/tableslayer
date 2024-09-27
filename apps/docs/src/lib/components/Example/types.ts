import type { Snippet } from 'svelte';
export type ExampleProps = {
  children: Snippet;
  codeBlock?: Snippet;
  propsName: string;
  title: string;
  layout?: 'row' | 'column';
};
