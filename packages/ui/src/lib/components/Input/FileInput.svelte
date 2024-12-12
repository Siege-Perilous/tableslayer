<script lang="ts">
  import type { FileInputProps } from './types';
  import { onDestroy } from 'svelte';
  import classNames from 'classnames';

  let { value = $bindable(), files = $bindable(), variant = 'default', ...restProps }: FileInputProps = $props();

  const inputClasses = classNames('fileInput', variant && `fileInput--${variant}`, restProps.class ?? '');

  // Array to keep track of generated object URLs for cleanup
  let generatedUrls: string[] = [];

  // Function to clean up generated URLs
  const previousUrlsCleanup = () => {
    for (const url of generatedUrls) {
      URL.revokeObjectURL(url);
    }
    generatedUrls = [];
  };

  // Create a derived value for preview URLs based on `files`
  let previewUrls = $derived.by(() => {
    if (files.length > 0) {
      const urls = [];
      for (const file of files) {
        if (file && (file.type.startsWith('image/png') || file.type.startsWith('image/jpeg'))) {
          const objectUrl = URL.createObjectURL(file);
          urls.push(objectUrl);
          generatedUrls.push(objectUrl); // Keep track of generated URLs for cleanup
        }
      }
      return urls;
    }
    return [];
  });

  // Clean up the object URLs to prevent memory leaks when the component is destroyed
  onDestroy(() => {
    previousUrlsCleanup();
  });
</script>

<div class={inputClasses}>
  <!-- File input for selecting images -->
  <input bind:files {...restProps} type="file" class="fileInput__input" accept="image/png, image/jpeg" />

  <!-- Display previews for all selected files -->
  {#each previewUrls as previewUrl}
    <img src={previewUrl} alt="Preview" class="fileInput__preview" />
  {/each}
</div>

<style>
  .fileInput {
    display: flex;
    flex-direction: column;
  }
  .fileInput__input::file-selector-button {
    background: var(--inputBg);
    padding: 0 var(--size-2);
    color: var(--fg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    padding: 0.25rem 0.75rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .fileInput__input::file-selector-button:hover {
    background: var(--inputFocusBg);
  }
  [data-fs-error] {
    border-color: var(--fgDanger);
  }
  .fileInput__preview {
    max-width: 8rem;
    max-height: 8rem;
    margin-top: 1rem;
    margin-right: 0.5rem;
  }
</style>
