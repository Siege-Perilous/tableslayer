<script lang="ts">
  import type { CodeBlockProps } from './types';
  import { onMount } from 'svelte';
  import { codeToHtml } from 'shiki';

  let { code, lang = 'svelte', variant = 'default' }: CodeBlockProps = $props();

  let highlightedCode = $state('');

  onMount(async () => {
    highlightedCode = await codeToHtml(code, {
      lang: lang,
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      defaultColor: false // Forces shiki to use light / dark css vars which we need for nesting
    });
  });

  let codeBlockClasses = $derived(['codeBlock', `codeBlock--${variant}`]);
</script>

<span class={codeBlockClasses}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html highlightedCode}
</span>

<style>
  :global(.shiki) {
    font-family: var(--font-mono);
    padding: var(--size-4);
    margin: 0;
  }
  :global(.codeBlock--inline .shiki) {
    font-family: var(--font-mono);
    padding: 0 var(--size-1);
    margin: 0;
  }
  .codeBlock {
    font-family: var(--font-mono);
    max-width: 100%;
    overflow-x: auto;
    border: var(--borderThin);
    border-color: var(--contrastEmpty);
    display: block;
  }
  .codeBlock--inline {
    display: inline-block;
    width: auto;
    overflow-x: unset;
  }
  :global {
    /* Default: Inherit colors from inline styles (Shiki sets both light & dark variables inline) */
    .shiki,
    .shiki span {
      color: var(--shiki-light) !important;
      background-color: var(--contrastLowest) !important;
      font-style: var(--shiki-light-font-style) !important;
      font-weight: var(--shiki-light-font-weight) !important;
      text-decoration: var(--shiki-light-text-decoration) !important;
    }

    /* In light mode, just inherit (Shiki's inline styles apply the light theme by default) */
    .light .shiki,
    .light .shiki span {
      color: var(--shiki-light) !important;
      background-color: var(--contrastLowest) !important;
      font-style: var(--shiki-light-font-style) !important;
      font-weight: var(--shiki-light-font-weight) !important;
      text-decoration: var(--shiki-light-text-decoration) !important;
    }

    /* In dark mode, override with the Shiki dark theme variables */
    .dark .shiki,
    .dark .shiki span {
      color: var(--shiki-dark) !important;
      background-color: var(--contrastLowest) !important;
      font-style: var(--shiki-dark-font-style) !important;
      font-weight: var(--shiki-dark-font-weight) !important;
      text-decoration: var(--shiki-dark-text-decoration) !important;
    }
    .dark .light .shiki,
    .dark .light .shiki span {
      color: var(--shiki-light) !important;
      background-color: var(--contrastLowest) !important;
      font-style: var(--shiki-light-font-style) !important;
      font-weight: var(--shiki-light-font-weight) !important;
      text-decoration: var(--shiki-light-text-decoration) !important;
    }

    /* Handle nested dark inside light: force dark mode variables */
    .light .dark .shiki,
    .light .dark .shiki span {
      color: var(--shiki-dark) !important;
      background-color: var(--contrastLowest) !important;
      font-style: var(--shiki-dark-font-style) !important;
      font-weight: var(--shiki-dark-font-weight) !important;
      text-decoration: var(--shiki-dark-text-decoration) !important;
    }
  }
</style>
