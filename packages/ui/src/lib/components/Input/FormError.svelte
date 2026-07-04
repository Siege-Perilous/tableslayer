<script lang="ts">
  import { IconX } from '@tabler/icons-svelte';
  import { Icon } from '../';
  import { type $ZodIssue } from 'zod/v4/core';

  type FormMutationResponse = {
    success: boolean;
    status: number;
    message: string;
    errors?: $ZodIssue[];
  };
  let { error }: { error?: FormMutationResponse } = $props();
</script>

{#if error}
  <div class="formError" data-testid="formError">
    <Icon Icon={IconX} class="formErrorIcon" />
    <p>{error.message}</p>
  </div>
{/if}

<style>
  :global(.formErrorIcon) {
    margin-top: 2px;
  }
  .formError {
    display: flex;
    gap: 0.25rem;
    color: var(--fgDanger);
    font-size: 1rem;
    font-weight: var(--font-weight-6);
    margin-top: 1rem;
    border-radius: 0.5rem;
    min-height: 1.75rem;
    align-items: start;
  }
</style>
