<script lang="ts">
  import type { CodeBlockProps } from './types';
  import { onMount } from 'svelte';
  import { createHighlighter } from 'shiki';
  import { createCssVariablesTheme } from 'shiki/theme-css-variables';

  let { code, lang = 'svelte' }: CodeBlockProps = $props();

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
</script>

<div class="codeBlock">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html highlightedCode}
</div>

<style>
  :global(.light) {
    color-scheme: light;
    --shiki-foreground: #4c566a;
    --shiki-background: #fafafa;
    --shiki-token-constant: #b48ead;
    --shiki-token-string: #a3be8c;
    --shiki-token-comment: #d08770;
    --shiki-token-keyword: #81a1c1;
    --shiki-token-parameter: #8fbcbb;
    --shiki-token-function: #5e81ac;
    --shiki-token-string-expression: #ebcb8b;
    --shiki-token-punctuation: #4c566a;
    --shiki-token-link: #88c0d0;
  }

  :global(.dark) {
    color-scheme: dark;
    --shiki-foreground: #cdd6f4;
    --shiki-background: #1e1e2e;
    --shiki-token-constant: #f38ba8;
    --shiki-token-string: #a6e3a1;
    --shiki-token-comment: #7f849c;
    --shiki-token-keyword: #89b4fa;
    --shiki-token-parameter: #94e2d5;
    --shiki-token-function: #cba6f7;
    --shiki-token-string-expression: #fab387;
    --shiki-token-punctuation: #cdd6f4;
    --shiki-token-link: #74c7ec;
  }
  :global(.shiki) {
    font-family: var(--font-mono);
    padding: var(--size-4);
  }
  .codeBlock {
    font-family: var(--font-mono);
    max-width: 100%;
    overflow-x: auto;
  }
</style>
