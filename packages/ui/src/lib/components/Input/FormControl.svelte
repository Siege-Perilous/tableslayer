<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Label } from './';
  import type { HTMLBaseAttributes } from 'svelte/elements';
  import { IconX } from '@tabler/icons-svelte';
  import { Icon } from '../';
  import { type $ZodIssue } from 'zod/v4/core';
  import { v4 as uuidv4 } from 'uuid';
  type Props = {
    /**
     * The input component that will be rendered
     */
    input: Snippet<
      [
        {
          inputProps: {
            id: string;
            name: string;
            'aria-describedby'?: string;
            'aria-invalid'?: boolean;
          };
        }
      ]
    >;
    /**
     * The label for the input
     */
    label?: string;
    /**
     * A snippet that will be rendered at the start of the input
     */
    start?: Snippet;
    /**
     * A snippet that will be rendered at the end of the input
     */
    end?: Snippet;
    /**
     * The name needs to match a "path" in our zod schema
     */
    name: string;
    /**
     * This shape matches what returns from zod / mutation factories
     */
    errors?: $ZodIssue[];
  } & HTMLBaseAttributes;

  let { input, label, start, name, errors, end, ...restProps }: Props = $props();
  let error = $derived(errors?.find((error) => error.path.includes(name)));

  const id = `control-${uuidv4()}`;

  let inputProps = $derived.by(() => {
    return {
      id,
      name,
      'aria-describedby': error && `error-${id}`,
      'aria-invalid': !!error
    };
  });

  let inputWrapperClasses = $derived([
    'control__inputWrapper',
    start && 'control__inputWrapper--start',
    end && 'control__inputWrapper--end'
  ]);
  const controlClasses = $derived(['control', error && 'control--isError', restProps.class ?? '']);
</script>

<div class={controlClasses}>
  <Label class="control__label" for={id}>{label}</Label>
  <div class={inputWrapperClasses}>
    {#if start}
      <div class="control__start">{@render start()}</div>
    {/if}
    {@render input({ inputProps })}
    {#if end}
      <div class="control__end">{@render end()}</div>
    {/if}
  </div>
  {#if error}
    <div class="control__error" id={`error-${id}`}>
      <Icon Icon={IconX} class="control__errorIcon" />
      {error.message}
    </div>
  {/if}
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
    .control__erorIcon {
      margin-top: 1px;
    }
  }
  .control {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
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
    height: 2rem;
    border: var(--borderThin);
    border-color: var(--inputBorderColor);
    padding: 0 0.75rem;
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
  .control__error {
    display: inline-flex;
    gap: 0.25rem;
    color: var(--fgDanger);
    font-size: 1rem;
    font-weight: var(--font-weight-6);
    margin-top: 0.25rem;
    border-radius: 0.5rem;
    min-height: 1.75rem;
    align-items: center;
  }

  :global(.control .control__label) {
    display: block;
  }
</style>
