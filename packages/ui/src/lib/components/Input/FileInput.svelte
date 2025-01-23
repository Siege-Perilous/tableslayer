<script lang="ts">
  import type { FileInputProps } from './types';
  import { onDestroy } from 'svelte';

  let { value = $bindable(), files = $bindable(), variant = 'default', ...restProps }: FileInputProps = $props();

  let inputClasses = $derived(['fileInput', variant && `fileInput--${variant}`, restProps.class ?? '']);

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
        if (
          (file && (file.type.startsWith('image/png') || file.type.startsWith('image/jpeg'))) ||
          file.type.startsWith('image/webp')
        ) {
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
  {#if variant === 'dropzone'}
    <label class="fileInput__dropZoneLabel" for={restProps.id}><div>Select an image</div></label>
  {/if}
  <!-- File input for selecting images -->
  <input bind:files {...restProps} type="file" class="fileInput__input" accept="image/png, image/jpeg, image/webp" />

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
  .fileInput--dropzone {
    width: 100%;
    max-width: 100%;
    cursor: pointer;
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
  }

  .fileInput--dropzone .fileInput__preview {
    margin: 0;
    max-width: 100%;
    max-height: 100%;
    object-fit: cover;
  }
  .fileInput--dropzone input {
    visibility: hidden;
    display: none;
  }
  .fileInput--dropzone .fileInput__dropZoneLabel {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    z-index: 2;
    top: 0;
    left: 0;
  }
  .fileInput--dropzone .fileInput__dropZoneLabel div {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-1);
    font-size: 0.85rem;
  }
</style>
