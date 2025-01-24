<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Label, FSLabel } from './';
  import type { HTMLBaseAttributes } from 'svelte/elements';
  type Props = {
    children?: Snippet<[Record<string, unknown>]>;
    content?: Snippet<[{ id: string }]>;
    label?: string;
    start?: Snippet;
    end?: Snippet;
    props?: Record<string, unknown>;
    id?: string;
  } & HTMLBaseAttributes;

  let { children, content, label, start, end, id, props, ...restProps }: Props = $props();

  let inputId = id || `control-${crypto.randomUUID()}`;

  let inputWrapperClasses = $derived([
    'control__inputWrapper',
    start && 'control__inputWrapper--start',
    end && 'control__inputWrapper--end'
  ]);
  const controlClasses = $derived(['control', restProps.class ?? '']);
</script>

<div class={controlClasses}>
  {#if label && props}
    <FSLabel class="control__label">{label}</FSLabel>
  {:else if label}
    <Label class="control__label" for={inputId}>{label}</Label>
  {/if}
  <div class={inputWrapperClasses}>
    {#if start}
      <div class="control__start">{@render start()}</div>
    {/if}
    {#if props && children}
      {@render children({ ...props })}
    {:else if content}
      {@render content({ id: inputId })}
    {:else if children}
      {@render children()}
    {/if}
    {#if end}
      <div class="control__end">{@render end()}</div>
    {/if}
  </div>
</div>

<style>
  /* global required for children */
  :global {
    .control__inputWrapper--start input.input {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }
    .control__inputWrapper--end input.input {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
  }
  .control {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
    width: 100%;
  }
  .control__inputWrapper {
    display: flex;
    align-items: center;
    width: 100%;
  }
  .control__start,
  .control__end {
    display: flex;
    align-items: center;
    height: var(--size-8);
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
    padding: 0 var(--size-3);
    background: var(--contrastLow);
    color: var(--fgMuted);
  }
  .control__start {
    border-top-left-radius: var(--radius-2);
    border-bottom-left-radius: var(--radius-2);
    border-right: none;
  }
  .control__end {
    border-top-right-radius: var(--radius-2);
    border-bottom-right-radius: var(--radius-2);
    border-left: none;
  }

  :global(.control .control__label) {
    display: block;
  }
</style>
