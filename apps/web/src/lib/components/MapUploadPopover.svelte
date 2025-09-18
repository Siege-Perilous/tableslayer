<script lang="ts">
  import { Button, FormControl, Input, Popover, FileInput, Icon } from '@tableslayer/ui';
  import { IconPlus, IconPhoto } from '@tabler/icons-svelte';

  interface Props {
    buttonText?: string;
    buttonIcon?: typeof IconPlus;
    buttonVariant?: 'default' | 'outline' | 'ghost';
    onSubmit: (file: File, gridWidth?: number, gridHeight?: number) => Promise<void>;
    isLoading?: boolean;
    mode?: 'create' | 'replace';
  }

  let {
    buttonText = 'Add scene',
    buttonIcon = IconPlus,
    buttonVariant = 'default',
    onSubmit,
    isLoading = false,
    mode = 'create'
  }: Props = $props();

  let isOpen = $state(false);
  let selectedFile = $state<File | null>(null);
  let gridWidth = $state<number | undefined>(undefined);
  let gridHeight = $state<number | undefined>(undefined);
  let isSubmitting = $state(false);

  // Extract dimensions from filename
  function extractDimensionsFromFilename(filename: string): { width?: number; height?: number } {
    // Look for patterns like: 30x20, 30X20, 30-20, 30_20
    // Also handle patterns with 'g' or 'grid' prefix: g-30x20, grid-30x20
    const patterns = [
      /(?:g|grid)?[-_]?(\d+)[xX](\d+)/, // Matches g-30x20, grid-30x20, 30x20
      /(?:g|grid)?[-_]?(\d+)[-_](\d+)/ // Matches g-30-20, grid_30_20, 30-20, 30_20
    ];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        const num1 = parseInt(match[1], 10);
        const num2 = parseInt(match[2], 10);

        // TVs are always landscape, so use the larger number as width
        return {
          width: Math.max(num1, num2),
          height: Math.min(num1, num2)
        };
      }
    }

    return {};
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      selectedFile = file;

      // Auto-detect dimensions from filename
      const dimensions = extractDimensionsFromFilename(file.name);
      if (dimensions.width && dimensions.height) {
        gridWidth = dimensions.width;
        gridHeight = dimensions.height;
      }
    }
  }

  async function handleSubmit(close: () => void) {
    if (!selectedFile) return;

    isSubmitting = true;
    try {
      await onSubmit(selectedFile, gridWidth, gridHeight);
    } catch (error) {
      // Error will be handled by the parent component's toast system
    } finally {
      // Always reset form and close popover after submission
      selectedFile = null;
      gridWidth = undefined;
      gridHeight = undefined;
      close();
      isSubmitting = false;
    }
  }

  function handleCancel(close: () => void) {
    selectedFile = null;
    gridWidth = undefined;
    gridHeight = undefined;
    close();
  }
</script>

<Popover bind:isOpen>
  {#snippet trigger()}
    <Button variant={buttonVariant} size="small" disabled={isLoading} {isLoading}>
      <Icon Icon={buttonIcon} size={16} />
      {buttonText}
    </Button>
  {/snippet}

  {#snippet content({ contentProps })}
    <div class="mapUploadPopover">
      <h3 class="mapUploadPopover__title">
        {mode === 'create' ? 'Add new scene' : 'Replace map image'}
      </h3>

      <div class="mapUploadPopover__section">
        <FormControl label="Map image" name="mapImage" required>
          {#snippet input({ inputProps })}
            <Button variant="outline" size="small" style="width: 100%; position: relative; overflow: hidden;">
              <Icon Icon={IconPhoto} size="20px" />
              {selectedFile ? selectedFile.name : 'Choose image'}
              <FileInput
                {...inputProps}
                type="file"
                accept="image/*"
                onchange={handleFileChange}
                style="position: absolute; inset: 0; opacity: 0; cursor: pointer;"
              />
            </Button>
          {/snippet}
        </FormControl>
      </div>

      <div class="mapUploadPopover__section">
        <p class="mapUploadPopover__help">Optional: Specify grid dimensions for automatic alignment</p>

        <div class="mapUploadPopover__dimensions">
          <FormControl label="Grid width" name="gridWidth">
            {#snippet input({ inputProps })}
              <Input {...inputProps} type="number" min={1} step={1} bind:value={gridWidth} placeholder="e.g., 30" />
            {/snippet}
          </FormControl>

          <FormControl label="Grid height" name="gridHeight">
            {#snippet input({ inputProps })}
              <Input {...inputProps} type="number" min={1} step={1} bind:value={gridHeight} placeholder="e.g., 20" />
            {/snippet}
          </FormControl>
        </div>
      </div>

      <div class="mapUploadPopover__footer">
        <Button variant="ghost" size="small" onclick={() => handleCancel(contentProps.close)}>Cancel</Button>
        <Button
          variant="default"
          size="small"
          disabled={!selectedFile || isSubmitting}
          isLoading={isSubmitting}
          onclick={() => handleSubmit(contentProps.close)}
        >
          {mode === 'create' ? 'Create scene' : 'Update map'}
        </Button>
      </div>
    </div>
  {/snippet}
</Popover>

<style>
  .mapUploadPopover {
    padding: var(--space-4);
    min-width: 300px;
  }

  .mapUploadPopover__title {
    font-size: var(--font-size-lg);
    font-weight: 600;
    margin-bottom: var(--space-4);
  }

  .mapUploadPopover__section {
    margin-bottom: var(--space-4);
  }

  .mapUploadPopover__help {
    font-size: var(--font-size-sm);
    color: var(--fgMuted);
    margin-bottom: var(--space-2);
  }

  .mapUploadPopover__dimensions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .mapUploadPopover__footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--bgBorder);
  }
</style>
