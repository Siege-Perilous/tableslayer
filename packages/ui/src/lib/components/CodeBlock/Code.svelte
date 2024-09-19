<script lang="ts">
  import { CodeBlock } from './';
  import type { CodeProps } from './';
  let { code, lang = 'svelte', ...restProps }: CodeProps = $props();
</script>

<CodeBlock {code} {lang} variant="inline" {...restProps} />
