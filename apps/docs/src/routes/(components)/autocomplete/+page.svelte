<script lang="ts">
  import { IconSearch } from '@tabler/icons-svelte';
  import { Autocomplete, FormControl, Icon, Spacer, type AutocompleteOption } from '@tableslayer/ui';
  import { Example } from '#lib/components/index.js';

  const terrain: AutocompleteOption[] = [
    { value: 'clear', label: 'Clear', description: '1 to enter' },
    { value: 'rough', label: 'Rough', description: '2 to enter' },
    { value: 'forest', label: 'Forest', description: '2 to enter' },
    { value: 'town', label: 'Town', description: '1 to enter' },
    { value: 'city', label: 'City', description: '1 to enter' },
    { value: 'marsh', label: 'Marsh', description: '3 to enter' },
    { value: 'mountain', label: 'Mountain', description: 'Cannot be entered', isDisabled: true }
  ];
  const units: AutocompleteOption[] = [
    { value: 'i-1', label: '1st Infantry', group: 'I Corps' },
    { value: 'i-2', label: '2nd Infantry', group: 'I Corps' },
    { value: 'i-a', label: '1st Armoured', group: 'I Corps' },
    { value: 'ii-4', label: '4th Infantry', group: 'II Corps' },
    { value: 'ii-5', label: '5th Infantry', group: 'II Corps' },
    { value: 'ii-g', label: 'Guards Armoured', group: 'II Corps' }
  ];
  const towns: AutocompleteOption[] = [
    'Ashford',
    'Barrow',
    'Blackwater',
    'Bridgend',
    'Calder',
    'Castle Hill',
    'Coldbrook',
    'Dunmere',
    'Eastwick',
    'Fairholt',
    'Fenwick',
    'Greywater',
    'Harrowgate',
    'Highbridge',
    'Kingsmere',
    'Langford',
    'Marshfield',
    'Millbrook',
    'Northwick',
    'Oakhurst',
    'Redbridge',
    'Saltmarsh',
    'Stonebridge',
    'Thornfield',
    'Westbrook',
    'Whitewater',
    'Wolford',
    'Yarrow'
  ].map((label) => ({ value: label.toLowerCase().replace(/\s+/g, '-'), label }));
  /** Stands in for a search made somewhere slow. */
  const findTown = (query: string): Promise<AutocompleteOption[]> =>
    new Promise((done) =>
      setTimeout(() => done(towns.filter((town) => town.label.toLowerCase().includes(query.toLowerCase()))), 400)
    );

  const colours: AutocompleteOption[] = [
    { value: 'clear', label: 'Clear', color: '#c9d19a' },
    { value: 'rough', label: 'Rough', color: '#c8b78c' },
    { value: 'forest', label: 'Forest', color: '#3f6b3a' },
    { value: 'town', label: 'Town', color: '#8a5a44' },
    { value: 'marsh', label: 'Marsh', color: '#5b8f8a' }
  ];

  let one = $state<string[]>(['forest']);
  let plain = $state<string[]>(['rough']);
  let many = $state<string[]>(['i-1', 'ii-g']);
  let coloured = $state<string[]>(['clear', 'forest']);
  let grouped = $state<string[]>([]);
  let found = $state<string[]>([]);
  let made = $state<string[]>([]);
  let features = $state<AutocompleteOption[]>([
    { value: 'town', label: 'Town' },
    { value: 'objective', label: 'Objective' },
    { value: 'supply', label: 'Supply source' }
  ]);
  let tags = $state<string[]>([]);
  let inForm = $state<string[]>([]);
  let small = $state<string[]>(['clear']);
</script>

<p class="docLead">
  A combo box. What is chosen sits in the field as pills, with a place to type beside them; the list under it holds the
  options that match what is typed. Arrow keys move through the list, Enter takes the option lit, Backspace in an empty
  field takes the last choice off, Escape shuts the list. What is chosen is a list of values, as it is for <code>
    Select
  </code>
  .
</p>

<Example title="Several choices" propsName="Autocomplete">
  <div style="width: 22rem" data-testid="multiple">
    <Autocomplete options={units} bind:selected={many} isMultiple placeholder="Add a unit" aria-label="Units" />
    <p class="docValue">selected: {JSON.stringify(many)}</p>
  </div>
</Example>
<p class="docNote">Each is a pill in the field. Those chosen leave the list, which stays open for the next.</p>
<Spacer size="2rem" />

<Example title="One choice" propsName="">
  <div style="width: 14rem" data-testid="single">
    <Autocomplete options={terrain} bind:selected={one} placeholder="Terrain" aria-label="Terrain" />
    <p class="docValue">selected: {JSON.stringify(one)}</p>
  </div>
  <div style="width: 14rem" data-testid="plain">
    <Autocomplete
      options={terrain}
      bind:selected={plain}
      isPlainText
      isClearable={false}
      placeholder="Terrain"
      aria-label="Terrain, as words"
    />
    <p class="docValue">isPlainText, not clearable · selected: {JSON.stringify(plain)}</p>
  </div>
</Example>
<p class="docNote">As a pill, or as plain words. Choosing another replaces it.</p>
<Spacer size="2rem" />

<Example title="Coloured pills" propsName="">
  <div style="width: 22rem">
    <Autocomplete
      options={colours}
      bind:selected={coloured}
      isMultiple
      placeholder="Terrain"
      aria-label="Terrain, coloured"
    />
  </div>
</Example>
<p class="docNote">An option may carry a colour, which its pill takes.</p>
<Spacer size="2rem" />

<Example title="Under headings" propsName="">
  <div style="width: 16rem">
    <Autocomplete options={units} bind:selected={grouped} placeholder="Unit" aria-label="Unit" />
  </div>
</Example>
<p class="docNote">Options that share a group, given together, are listed under it.</p>
<Spacer size="2rem" />

<Example title="Options found as you type" propsName="">
  <div style="width: 14rem" data-testid="async">
    <Autocomplete options={findTown} bind:selected={found} placeholder="Find a town" aria-label="Town">
      {#snippet start()}<Icon Icon={IconSearch} size="0.875rem" />{/snippet}
    </Autocomplete>
    <p class="docValue">selected: {JSON.stringify(found)}</p>
  </div>
</Example>
<p class="docNote">A function is asked for the options matching the text, a moment after typing stops.</p>
<Spacer size="2rem" />

<Example title="Custom options" propsName="">
  <div style="width: 20rem" data-testid="create">
    <Autocomplete
      options={features}
      bind:selected={made}
      isMultiple
      placeholder="Feature"
      aria-label="Features"
      onCreate={(text) => {
        const option = { value: text.toLowerCase().replace(/\s+/g, '-'), label: text };
        features = [...features, option];
        return option;
      }}
    />
    <p class="docValue">selected: {JSON.stringify(made)}</p>
  </div>
</Example>
<p class="docNote">Text that matches nothing can be made into an option, on Enter or on leaving the field.</p>
<Spacer size="2rem" />

<Example title="Custom options only, with a delimiter" propsName="">
  <div style="width: 22rem" data-testid="tags">
    <Autocomplete
      options={[]}
      bind:selected={tags}
      isMultiple
      showSuggestions={false}
      delimiter=","
      placeholder="Type names, with commas between"
      aria-label="Names"
      onCreate={(text) => ({ value: text, label: text })}
    />
    <p class="docValue">selected: {JSON.stringify(tags)}</p>
  </div>
</Example>
<p class="docNote">No list. A comma ends each one, so a list pasted in with commas becomes that many pills.</p>
<Spacer size="2rem" />

<Example title="In a form, and in a cell" propsName="" layout="column">
  <div style="width: 16rem; align-self: center">
    <FormControl label="Terrain" name="terrain">
      {#snippet input({ inputProps })}
        <Autocomplete {...inputProps} options={terrain} bind:selected={inForm} placeholder="Choose" />
      {/snippet}
    </FormControl>
  </div>
  <div style="width: 10rem; align-self: center">
    <Autocomplete
      options={terrain}
      bind:selected={small}
      variant="transparent"
      size="sm"
      isPlainText
      isClearable={false}
      aria-label="Terrain in a cell"
    />
  </div>
</Example>
<p class="docNote">Under a FormControl's label; and small, bare and as plain words, as it sits in a table.</p>
<Spacer size="2rem" />

<Example title="Disabled" propsName="">
  <div style="width: 14rem">
    <Autocomplete options={terrain} selected={['rough']} isDisabled aria-label="Disabled" />
  </div>
</Example>
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
