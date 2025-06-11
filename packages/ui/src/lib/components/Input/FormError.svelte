<script lang="ts">
  import { IconX } from '@tabler/icons-svelte';
  import { Icon } from '../';
  import { type ZodIssue } from 'zod/v4';

  type FormMutationResponse = {
    success: boolean;
    status: number;
    message: string;
    errors?: ZodIssue[];
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
    gap: var(--size-1);
    color: var(--fgDanger);
    font-size: var(--font-size-1);
    font-weight: var(--font-weight-6);
    margin-top: 1rem;
    border-radius: var(--size-2);
    min-height: var(--size-7);
    align-items: start;
  }
</style>
