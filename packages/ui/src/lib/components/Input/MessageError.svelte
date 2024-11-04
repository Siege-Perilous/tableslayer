<script lang="ts">
  import { IconX } from '@tabler/icons-svelte';
  import { Icon, addToast } from '../';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { message }: { message: any } = $props();

  $inspect(message);

  $effect(() => {
    if (message) {
      addToast({
        data: {
          title: message.text,
          body: message.type === 'error' ? 'Please check your form' : undefined,
          type: message.type === 'error' ? 'danger' : 'success'
        }
      });
    }
  });
</script>

{#if message}
  <div class="messageError" data-testid="messageError">
    <Icon Icon={IconX} class="messageErrorIcon" />
    <p>{message.text}</p>
  </div>
{/if}

<style>
  :global(.messageErrorIcon) {
    margin-top: 2px;
  }
  .messageError {
    display: flex;
    gap: var(--size-1);
    color: var(--fgDanger);
    font-size: var(--font-size-1);
    font-weight: var(--font-weight-6);
    margin-top: var(--size-1);
    border-radius: var(--size-2);
    min-height: var(--size-7);
    align-items: start;
  }
</style>
