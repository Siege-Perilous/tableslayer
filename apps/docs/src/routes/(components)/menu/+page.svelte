<script lang="ts">
  import { DropdownRadioMenu, Link, CodeBlock, Icon, Spacer } from '@tableslayer/ui';
  import { IconChevronDown } from '@tabler/icons-svelte';
  import { Example } from '$lib/components';
  import { page } from '$app/stores';
  const example = `
const menuItems = [
  {
    label: 'Party one',
    value: 'party1',
    href: '#party1'
  },
  {
    label: 'Party two',
    value: 'party2',
    href: '#party2'
  },
  {
    label: 'Party three',
    value: 'party3',
    href: '#party3'
  }
];

let selectedParty = $state(menuItems.find((party) => party.href === $page.url.hash) || menuItems[0]);
$effect(() => {
  selectedParty = menuItems.find((party) => party.href === $page.url.hash);
});

<DropdownRadioMenu items={menuItems} defaultItem={selectedParty} positioning={{ placement: 'bottom-start' }}>
  {#snippet trigger()}
    <div class="dropdown">
      <span>{selectedParty.label}</span>
      <Icon Icon={IconChevronDown} />
    </div>
  {/snippet}
  {#snippet footer()}
    <div class="dropdown__footer">
      <Link>Create a new party</Link>
    </div>
  {/snippet}
</DropdownRadioMenu>
`;
  const menuItems = [
    {
      label: 'Party one',
      value: 'party1',
      href: '#party1'
    },
    {
      label: 'Party two',
      value: 'party2',
      href: '#party2'
    },
    {
      label: 'Party three',
      value: 'party3',
      href: '#party3'
    }
  ];

  let selectedParty = $state(menuItems.find((party) => party.href === $page.url.hash) || menuItems[0]);
  $effect(() => {
    selectedParty = menuItems.find((party) => party.href === $page.url.hash) || menuItems[0];
  });
</script>

<Example title="DropdownRadioMenu" propsName="DropdownRadioMenu" layout="column">
  {#snippet codeBlock()}
    <CodeBlock code={example} lang="svelte" />
  {/snippet}

  <DropdownRadioMenu items={menuItems} defaultItem={selectedParty} positioning={{ placement: 'bottom-start' }}>
    {#snippet trigger()}
      <div class="dropdown">
        <span>{selectedParty.label}</span>
        <Icon Icon={IconChevronDown} />
      </div>
    {/snippet}
    {#snippet footer()}
      <div class="dropdown__footer">
        <Link>Create a new party</Link>
      </div>
    {/snippet}
  </DropdownRadioMenu>
</Example>

<Spacer size={8} />

<style>
  .dropdown {
    display: flex;
    gap: var(--size-2);
    align-items: center;
    font-weight: var(--font-weight-6);
  }
  .dropdown__footer {
    padding-left: 2.75rem;
  }
</style>
