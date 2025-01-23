<script lang="ts">
  import type { IconButtonProps } from './types';
  import classNames from 'classnames';

  let { children, size = 'md', variant = 'primary', ...restProps }: IconButtonProps = $props();

  console.log('variant from inside the button', variant);
  const iconBtnClasses = classNames('iconBtn', `iconBtn--${size}`, `iconBtn--${variant}`, restProps.class ?? '');
</script>

<button {...restProps} class={iconBtnClasses}>
  {@render children()}
</button>

<style>
  :global(.light) {
    --iconBtn-bg: var(--contrastEmpty);
    --iconBtn-bgHover: var(--primary-50);
    --iconBtn-border: solid 2px var(--fg);
    --iconBtn-borderHover: solid 2px var(--primary-600);
    --iconBtn-color: var(--fg);
    --iconBtn-dangerStripesHover: var(--primary-300);
  }

  :global(.dark) {
    color-scheme: dark;
    --iconBtn-bg: var(--bg);
    --iconBtn-bgHover: var(--primary-950);
    --iconBtn-border: solid 2px var(--fg);
    --iconBtn-borderHover: solid 2px var(--primary-500);
    --iconBtn-color: var(--fg);
    --iconBtn-dangerStripesHover: var(--primary-700);
  }
  .iconBtn {
    color: var(--iconBtn-color);
    background-color: var(--iconBtn-bg);
    border-radius: var(--radius-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-2);
    cursor: pointer;
    font-weight: var(--font-weight-5);
    border: var(--iconBtn-border);
    border-color: transparent;
    font-weight: var(--font-weight-6);
  }

  .iconBtn--sm {
    font-size: var(--font-size-1);
    height: var(--size-6);
    width: var(--size-6);
    min-width: var(--size-6);
  }
  .iconBtn--md {
    font-size: var(--font-size-1);
    height: var(--size-8);
    width: var(--size-8);
    min-width: var(--size-8);
  }
  .iconBtn--lg {
    font-size: var(--font-size-2);
    height: var(--size-9);
    width: var(--size-9);
    min-width: var(--size-9);
  }
  .iconBtn--primary {
    border-color: var(--fg);
  }
  .iconBtn--danger {
    border-color: var(--fg);
    background-image: linear-gradient(
      135deg,
      transparent 10%,
      transparent 10%,
      transparent 50%,
      color-mix(in srgb, var(--fg), transparent 40%) 50%,
      color-mix(in srgb, var(--fg), transparent 40%) 50%,
      transparent 60%,
      transparent 100%
    );
    background-size: 14.14px 14.14px;
    text-shadow: 0 0 4px var(--bg);
  }
  .iconBtn--danger:hover {
    background-image: linear-gradient(
      135deg,
      transparent 10%,
      transparent 10%,
      transparent 50%,
      var(--iconBtn-dangerStripesHover),
      var(--iconBtn-dangerStripesHover),
      transparent 60%,
      transparent 100%
    );
  }
  .iconBtn:hover {
    background-color: var(--iconBtn-bgHover);
    border: var(--iconBtn-borderHover);
  }
  .iconBtn--isDisabled {
    cursor: pointer;
  }
  .iconBtn--ghost {
    background: none;
    border-color: transparent;
  }
  .iconBtn--link {
    background: none;
    border-color: transparent;
    color: var(--fgPrimary);
  }
  .iconBtn--link:hover {
    background: none;
    border-color: transparent;
    text-decoration: underline;
  }
</style>
