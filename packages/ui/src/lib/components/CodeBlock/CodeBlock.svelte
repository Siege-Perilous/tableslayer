<script lang="ts">
  import type { CodeBlockProps } from './types';
  import { onMount } from 'svelte';
  import { createHighlighter } from 'shiki';
  import { createCssVariablesTheme } from 'shiki/theme-css-variables';

  let { code, lang = 'svelte', variant = 'default' }: CodeBlockProps = $props();

  let highlightedCode = $state('');

  const theme = createCssVariablesTheme({
    name: 'css-variables',
    variablePrefix: '--shiki-',
    variableDefaults: {},
    fontStyle: true
  });

  onMount(async () => {
    const highlighter = await createHighlighter({
      langs: ['svelte', 'css', 'javascript', 'typescript'],
      themes: [theme]
    });

    highlightedCode = highlighter.codeToHtml(code, {
      lang: lang,
      theme: 'css-variables'
    });
  });

  const codeBlockClasses = $derived(['codeBlock', `codeBlock--${variant}`]);
</script>

<span class={codeBlockClasses}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html highlightedCode}
</span>

<style>
  :global(.light) {
    color-scheme: light;
    --shiki-foreground: var(--fg);
    --shiki-background: var(--contrastLowest);
    --shiki-token-constant: #d33682;
    --shiki-token-string: #2aa198;
    --shiki-token-comment: #93a1a1;
    --shiki-token-keyword: #6c71c4;
    --shiki-token-parameter: #b58900;
    --shiki-token-function: #268bd2;
    --shiki-token-string-expression: #073642;
    --shiki-token-punctuation: #657b83;
    --shiki-token-link: #cb4b16;
  }

  :global(.dark) {
    color-scheme: dark;
    --shiki-foreground: var(--fg);
    --shiki-background: var(--contrastLowest);
    --shiki-token-constant: #ff79c6;
    --shiki-token-string: #f1fa8c;
    --shiki-token-comment: #6272a4;
    --shiki-token-keyword: #8be9fd;
    --shiki-token-parameter: #bd93f9;
    --shiki-token-function: #50fa7b;
    --shiki-token-string-expression: #f8f8f2;
    --shiki-token-punctuation: #ffb86c;
    --shiki-token-link: #ff5555;
  }
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
</style>
