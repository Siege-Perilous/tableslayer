<script lang="ts">
  import { FormControl, NumberInput, Spacer } from '@tableslayer/ui';
  import { Example } from '#lib/components/index.js';

  let cost = $state<number | null>(2);
  let half = $state<number | null>(0.5);
  let empty = $state<number | null>(null);
  let small = $state<number | null>(4);
  let settled = $state('nothing yet');
</script>

<p class="docLead">
  A field for a number. The arrow keys and the buttons step it, by ten with Shift; it is held within its least and most,
  and settled on Enter or on leaving the field.
</p>

<Example title="Stepping" propsName="NumberInput">
  <div style="width: 7rem" data-testid="whole">
    <NumberInput
      bind:value={cost}
      min={0}
      max={9}
      aria-label="Cost"
      onValueChange={(value) => (settled = String(value))}
    />
    <p class="docValue">{cost} · settled: {settled}</p>
  </div>
  <div style="width: 7rem">
    <NumberInput bind:value={half} min={0} max={4} step={0.5} aria-label="Cost in halves" />
    <p class="docValue">{half}</p>
  </div>
</Example>
<p class="docNote">From 0 to 9 by ones; and by halves.</p>
<Spacer size="2rem" />

<Example title="May be empty" propsName="">
  <div style="width: 7rem">
    <NumberInput bind:value={empty} isEmptyAllowed placeholder="None" aria-label="Limit" />
    <p class="docValue">{String(empty)}</p>
  </div>
</Example>
<p class="docNote">Left empty, the number is none.</p>
<Spacer size="2rem" />

<Example title="In a form, and in a cell" propsName="">
  <div style="width: 9rem">
    <FormControl label="Movement" name="movement">
      {#snippet input({ inputProps })}
        <NumberInput {...inputProps} bind:value={cost} min={0} />
      {/snippet}
      {#snippet end()}pts{/snippet}
    </FormControl>
  </div>
  <div style="width: 4.5rem">
    <NumberInput bind:value={small} variant="transparent" size="sm" showStepper={false} aria-label="In a cell" />
  </div>
  <div style="width: 7rem">
    <NumberInput value={3} isDisabled aria-label="Disabled" />
  </div>
</Example>
<p class="docNote">With a unit after it; and small and bare.</p>
<Spacer size="2rem" />

<style>
  .docLead {
    max-width: 44rem;
    margin: 0 0 2rem;
    line-height: 1.5;
    color: var(--fgMuted);
  }
  .docNote {
    margin: 0.5rem 0 0;
    font-size: 0.875rem;
    color: var(--fgMuted);
  }
  :global(.docValue) {
    margin: 0.25rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--fgMuted);
  }
</style>
