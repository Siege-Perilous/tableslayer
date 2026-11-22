<script lang="ts">
  import { Button, Dialog, FormControl, Input, Spacer, Text } from '@tableslayer/ui';
  import { Example } from '#lib/components/index.js';

  let isOpen = $state(false);
  let isLargeOpen = $state(false);
  let name = $state('The winter offensive');
</script>

<p class="docLead">
  A modal dialog over the page, for something that must be dealt with before going on. Focus is held inside it, and
  Escape or a click on the dimmed page closes it.
</p>

<Example title="With a heading and buttons" propsName="Dialog">
  <Button onclick={() => (isOpen = true)}>Rename the scenario</Button>
  <Button variant="ghost" onclick={() => (isLargeOpen = true)}>A large one</Button>
</Example>
<p class="docNote">A dialog takes the colours of where it is placed in the page.</p>
<Spacer size="2rem" />

<Dialog bind:isOpen title="Rename the scenario" size="sm">
  {#snippet children()}
    <FormControl label="Name" name="name">
      {#snippet input({ inputProps })}
        <Input {...inputProps} bind:value={name} />
      {/snippet}
    </FormControl>
  {/snippet}
  {#snippet footer({ close })}
    <Button variant="ghost" onclick={close}>Cancel</Button>
    <Button onclick={close}>Rename</Button>
  {/snippet}
</Dialog>

<Dialog bind:isOpen={isLargeOpen} title="A large dialog" size="lg">
  {#snippet children()}
    {#each Array.from({ length: 30 }, (_, index) => index) as line (line)}
      <Text size="0.875rem">Line {line + 1}: what does not fit scrolls, and the heading stays put.</Text>
    {/each}
  {/snippet}
</Dialog>

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
</style>
