<script lang="ts">
  import type { LinkProps } from './types';
  import classNames from 'classnames';
  let { children, href, color = 'primary', ...restProps }: LinkProps = $props();

  const linkClasses = classNames('link', `link--${color}`, ...(restProps.class ?? ''));
  console.log('restProps', restProps);
</script>

<a {href} {...restProps} class={linkClasses}>{@render children()}</a>

<style>
  :global(.light) {
    color-scheme: light;
    --link-color: var(--primary-600);
  }
  :global(.dark) {
    color-scheme: dark;
    --link-color: var(--primary-500);
  }
  .link {
    text-decoration: none;
    cursor: pointer;
    font-weight: var(--font-weight-6);
  }
  .link--primary {
    color: var(--fgPrimary);
  }
  .link--fg {
    color: var(--fg);
  }
  .link--bg {
    color: var(--bg);
  }
  .link--muted {
    color: var(--fgMuted);
  }
  .link:hover {
    text-decoration: underline;
  }
</style>
