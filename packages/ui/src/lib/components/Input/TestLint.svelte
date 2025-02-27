<script>
  // Missing type annotation should trigger a TypeScript ESLint rule
  let count = 0;

  // Unused variable should trigger a lint error
  const unusedVar = "I'm never used";

  // Function with implicit return type
  function increment() {
    count = count + 1;
    // Missing semicolon above
  }

  // Accessing undefined property
  $: doubleCount = count * 2;
</script>

<!-- Svelte-specific linting issues -->
<button onclick={increment}>
  Count is: {count}
</button>

<!-- Empty block with no content should trigger svelte rule -->
{#if false}{/if}

<!-- Lowercase component name -->
<mycomponent />
