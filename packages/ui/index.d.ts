// Declaration of a Svelte component with typed props
import { ButtonProps } from './components/Button/Button.svelte';

declare module '*.svelte' {
  import { SvelteComponent } from 'svelte';

  export class Button extends SvelteComponent<ButtonProps> {}
}
