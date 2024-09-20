<script lang="ts">
  import { CodeBlock, Code } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  const exampleCode = `/* Coloring the themes comes later */
a:has(> img) {
  border: 20px solid white;
}`;
</script>

<Example title="CodeBlock" propsName="CodeBlock">
  <div class="flex">
    <CodeBlock code={exampleCode} lang="css" />
  </div>
</Example>

<Example title="Code" propsName="Code">
  <div class="flex">
    <p>
      Inline <Code lang="typescript" code={`const a = 1;`} /> code block
    </p>
  </div>
</Example>

<style>
  .flex {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
