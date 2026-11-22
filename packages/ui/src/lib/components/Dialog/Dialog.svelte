<script lang="ts">
  import { IconX } from '@tabler/icons-svelte';
  import { Icon } from '../Icon';
  import { Title } from '../Title';
  import type { DialogProps } from './types';

  let {
    isOpen = $bindable(false),
    onIsOpenChange,
    title,
    size = 'md',
    isClosedOnOutsideClick = true,
    showCloseButton = true,
    children,
    footer,
    ...restProps
  }: DialogProps = $props();

  const uid = $props.id();
  let dialog = $state<HTMLDialogElement | null>(null);

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    onIsOpenChange?.(false);
  };

  // The browser's own modal dialog: it holds the focus, dims the page and closes on Escape.
  $effect(() => {
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  });

  /** Where a press began, so that a drag out of the dialog that ends on the page behind does not close it. */
  let pressedOutside = false;
  const classes = $derived(['dialog', `dialog--${size}`, restProps.class ?? '']);
</script>

<!--
@component
  ## Dialog

  A modal dialog over the page, for something that must be dealt with before going on. It is
  the browser's `<dialog>`, so focus is held inside it and Escape closes it.

  @example
  ```svelte
  <Dialog bind:isOpen title="Rename the scenario">
    {#snippet children()}
      <Input bind:value={name} />
    {/snippet}
    {#snippet footer({ close })}
      <Button variant="ghost" onclick={close}>Cancel</Button>
      <Button onclick={save}>Rename</Button>
    {/snippet}
  </Dialog>
  ```
-->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  {...restProps}
  bind:this={dialog}
  class={classes}
  aria-labelledby={title ? `${uid}-title` : undefined}
  onclose={close}
  onpointerdown={(event) => (pressedOutside = event.target === dialog)}
  onclick={(event) => {
    if (isClosedOnOutsideClick && pressedOutside && event.target === dialog) close();
  }}
>
  {#if isOpen}
    <div class="dialog__box">
      {#if title || showCloseButton}
        <header class="dialog__header">
          {#if title}
            <Title as="h2" size="sm" id={`${uid}-title`}>{title}</Title>
          {/if}
          {#if showCloseButton}
            <button type="button" class="dialog__close" aria-label="Close" onclick={close}>
              <Icon Icon={IconX} size="1rem" />
            </button>
          {/if}
        </header>
      {/if}
      <div class="dialog__content">
        {@render children({ close })}
      </div>
      {#if footer}
        <footer class="dialog__footer">
          {@render footer({ close })}
        </footer>
      {/if}
    </div>
  {/if}
</dialog>

<style>
  .dialog {
    width: 32rem;
    max-width: calc(100vw - 2rem);
    max-height: calc(100dvh - 2rem);
    padding: 0;
    color: var(--fg);
    background: var(--popoverBg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-3);
    overflow: hidden;
  }
  .dialog--sm {
    width: 22rem;
  }
  .dialog--lg {
    width: 48rem;
  }
  .dialog--full {
    width: calc(100vw - 2rem);
    height: calc(100dvh - 2rem);
  }
  .dialog::backdrop {
    background: rgb(0 0 0 / 0.55);
  }

  .dialog__box {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: calc(100dvh - 2rem);
  }
  .dialog__header {
    display: flex;
    align-items: center;
    flex: none;
    gap: 0.75rem;
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    border-bottom: var(--borderThin);
  }
  .dialog__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    margin-left: auto;
    padding: 0;
    color: var(--fgMuted);
    background: transparent;
    border: none;
    border-radius: var(--radius-1);
    cursor: pointer;
  }
  .dialog__close:hover {
    color: var(--fg);
    background: var(--contrastLow);
  }
  .dialog__content {
    flex: 1;
    min-height: 0;
    padding: 0.75rem;
    overflow-y: auto;
  }
  .dialog--full .dialog__content {
    padding: 0;
  }
  .dialog__footer {
    display: flex;
    flex: none;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-top: var(--borderThin);
  }
</style>
