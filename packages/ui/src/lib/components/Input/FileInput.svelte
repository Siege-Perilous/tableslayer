<script lang="ts">
  import type { FileInputProps } from './types';
  import { onDestroy, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    fileSelect: File;
  }>();

  let {
    value = $bindable(),
    files = $bindable(),
    variant = 'default',
    accept = 'image/png, image/jpeg, image/webp',
    showPreviews = true,
    ...restProps
  }: FileInputProps = $props();

  let inputClasses = $derived(['fileInput', variant && `fileInput--${variant}`, restProps.class ?? '']);

  // Default label text based on accept prop
  let labelText = $derived(() => {
    if (accept.includes('image/')) {
      return 'Select an image';
    } else if (accept.includes('.json')) {
      return 'Select a file';
    } else {
      return 'Select a file';
    }
  });

  // Array to keep track of generated object URLs for cleanup
  let generatedUrls: string[] = [];

  // Function to clean up generated URLs
  const previousUrlsCleanup = () => {
    for (const url of generatedUrls) {
      URL.revokeObjectURL(url);
    }
    generatedUrls = [];
  };

  // Function to check if file is an image
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/');
  };

  // Create a derived value for preview URLs based on `files`
  let previewUrls = $derived.by(() => {
    if (files && files.length > 0 && showPreviews) {
      const urls = [];
      for (const file of files) {
        // Only create previews for image files
        if (file && isImageFile(file)) {
          const objectUrl = URL.createObjectURL(file);
          urls.push(objectUrl);
          generatedUrls.push(objectUrl); // Keep track of generated URLs for cleanup
        }
      }
      return urls;
    }
    return [];
  });

  // Handle file selection
  function handleFileChange() {
    if (files && files.length > 0) {
      // Dispatch the first file
      dispatch('fileSelect', files[0]);
    }
  }

  // Clean up the object URLs to prevent memory leaks when the component is destroyed
  onDestroy(() => {
    previousUrlsCleanup();
  });
</script>

<div class={inputClasses}>
  {#if variant === 'dropzone'}
    <label class="fileInput__dropZoneLabel" for={restProps.id}><div>{labelText}</div></label>
  {/if}
  <!-- File input with configurable accept attribute -->
  <input bind:files {...restProps} type="file" class="fileInput__input" {accept} onchange={handleFileChange} />

  <!-- Display previews for image files if showPreviews is true -->
  {#if showPreviews}
    {#each previewUrls as previewUrl}
      <img src={previewUrl} alt="Preview" class="fileInput__preview" />
    {/each}
  {/if}
</div>

<style>
  .fileInput {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
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
  .fileInput--transparent {
    .fileInput__input {
      opacity: 0;
      border: none;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .fileInput__preview {
      display: none;
    }
  }
</style>
