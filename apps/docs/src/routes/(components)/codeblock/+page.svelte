<script lang="ts">
  import { CodeBlock, Code, ColorModeCompare, PropsTable } from '@tableslayer/ui';
  const exampleCode = `/* Coloring the themes comes later */
a:has(> img) {
  border: 20px solid white;
}`;
</script>

<ColorModeCompare>
  <div class="flex">
    <CodeBlock code={exampleCode} lang="css" />
  </div>
</ColorModeCompare>

<PropsTable componentName="CodeBlock" />

<ColorModeCompare>
  <div class="flex">
    <p>
      Inline <Code lang="typescript" code={`const a = 1;`} /> code block
    </p>
  </div>
</ColorModeCompare>

<PropsTable componentName="Code" />

<style>
  .flex {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
