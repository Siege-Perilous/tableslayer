<script lang="ts">
  import { FieldErrors } from 'formsnap';
  import { IconX } from '@tabler/icons-svelte';
  import { Icon } from '../';
</script>

<FieldErrors asChild let:errors let:errorAttrs>
  <ul class="fieldErrors" {...errorAttrs}>
    {#each errors as err}
      <li class="fieldError" {...errorAttrs}>
        <Icon Icon={IconX} class="fieldErrorIcon" />
        {err}
      </li>
    {/each}
  </ul>
</FieldErrors>

<style>
  .fieldErrors {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
  }
  .fieldError {
    display: inline-flex;
    gap: var(--size-1);
    color: var(--fgDanger);
    font-size: var(--font-size-1);
    font-weight: var(--font-weight-6);
    margin-top: var(--size-1);
    border-radius: var(--size-2);
    height: var(--size-7);
    align-items: center;
  }
  :global(.fieldErrorIcon) {
    margin-top: 1px;
  }
</style>
