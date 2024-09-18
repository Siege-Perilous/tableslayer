import type { HTMLBaseAttributes } from 'svelte/elements';

export type IconProps = {
  /**
   * Any icon from [tabler-icons](https://tabler.io/icons)
   */
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  Icon: any;
  /**
   * The size of the icon.
   * @default 24
   */
  size?: number | string;
  /**
   * The color of the icon.
   * @default 'currentColor'
   * */
  color?: string;
  stroke?: number;
} & HTMLBaseAttributes;
