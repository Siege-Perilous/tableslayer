<script lang="ts">
  import { CodeBlock, ColorModeCompare, PropsTable } from '@tableslayer/ui';
  const exampleCode = `/* Coloring the themes comes later */
a:has(> img) {
  border: 20px solid white;
}`;
</script>

<ColorModeCompare>
  <CodeBlock code={exampleCode} lang="css" />
</ColorModeCompare>

<PropsTable componentName="CodeBlock" />
