<script lang="ts">
  import type { FileInputProps } from './types';
  let { value = $bindable(), files = $bindable(), variant = 'default', ...restProps }: FileInputProps = $props();
  import { onDestroy } from 'svelte';
  import classNames from 'classnames';

  const inputClasses = classNames('fileInput', variant && `fileInput--${variant}`, restProps.class ?? '');

  let previewUrl = $state<string | null>(null);

  $effect(() => {
    console.log('Files changed:', files); // Debugging: Check if files is being updated correctly
    if (files?.length > 0) {
      const file = files[0];
      if (file && (file.type.startsWith('image/png') || file.type.startsWith('image/jpeg'))) {
        // Clean up old URL before creating a new one
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        previewUrl = URL.createObjectURL(file);
        console.log('Preview URL:', previewUrl); // Debugging: Verify the preview URL
      } else {
        previewUrl = null;
      }
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      previewUrl = null;
    }
  });

  // Clean up the object URL to prevent memory leaks
  onDestroy(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  });
</script>

<input bind:files {...restProps} type="file" class={inputClasses} accept="image/png, image/jpeg" />
{#if previewUrl}
  <img src={previewUrl} alt="Preview" class="image-preview" />
{/if}

<style>
  .input {
    height: var(--size-8);
    font-family: var(--font-sans);
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
    border-radius: var(--radius-2);
    padding: 0 var(--size-3);
    background: var(--inputBg);
    width: 100%;
    &:focus-visible {
      outline: none;
      border-color: var(--fg);
      background: var(--inputFocusBg);
    }
  }
  .input--transparent {
    border-color: transparent;
    background: transparent;
    &:hover {
      border-color: var(--inputBorderColor);
    }
  }
  [data-fs-error] {
    border-color: var(--fgDanger);
  }
</style>
