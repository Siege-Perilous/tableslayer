<script lang="ts">
  import { AvatarPopover, DropdownRadioMenu, Button, Title, Link, IconButton, Icon } from '@tableslayer/ui';
  import { IconMoon, IconSun } from '@tabler/icons-svelte';
  import { toggleMode, mode } from 'mode-watcher';
  let { data, children } = $props();
  const { user, parties } = data;
  import { IconChevronDown } from '@tabler/icons-svelte';
  import { getCldImageUrl } from 'svelte-cloudinary';
  const avatar = getCldImageUrl({ src: user?.avatar as string, width: 100, height: 100 });
  import { page } from '$app/stores';

  const menuItems = parties.map((party) => ({
    label: party.name,
    value: party.slug,
    href: `/${party.slug}`
  }));
  let selectedParty = $state(parties.find((party) => party.slug === $page.params.party));
  let partySlug = $state($page.params.party);
  $effect(() => {
    selectedParty = parties.find((party) => party.slug === $page.params.party);
    partySlug = $page.params.party;
  });
</script>

<header>
  <div class="header_container">
    <div class="header_container__section">
      <div class="logo">
        <Title as="p" size="md">TS</Title>
      </div>

      {#if partySlug}
        <DropdownRadioMenu items={menuItems} defaultItem={menuItems[0]} positioning={{ placement: 'bottom-start' }}>
          {#snippet trigger()}
            <div class="partyDropdown">
              <span>{selectedParty.name}</span>
              <Icon Icon={IconChevronDown} />
            </div>
          {/snippet}
        </DropdownRadioMenu>
      {/if}
    </div>

    <div class="header_container__section">
      <IconButton onclick={toggleMode} variant="ghost" title="Toggle theme">
        <Icon Icon={$mode === 'dark' ? IconSun : IconMoon} size={16} stroke={2} />
      </IconButton>
      <AvatarPopover src={avatar}>
        {#snippet content()}
          <div class="dropdown">
            <Link href="/profile">{user?.email}</Link>
            <Button href="/logout" variant="danger" data-sveltekit-preload-data="tap">logout</Button>
          </div>
        {/snippet}
      </AvatarPopover>
    </div>
  </div>
</header>

{@render children()}

<style>
  header {
    background: var(--bg);
    padding: var(--size-2);
    border-bottom: var(--borderThin);
  }
  .header_container {
    max-width: var(--contain-desktop);
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header_container__section {
    display: flex;
    align-items: center;
    gap: var(--size-4);
  }
  .dropdown {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }
  .partyDropdown {
    display: flex;
    gap: var(--size-2);
    align-items: center;
    font-weight: var(--font-weight-6);
  }
  .logo {
    background: var(--fgPrimary);
    border-radius: var(--radius-2);
    height: var(--size-8);
    width: var(--size-8);
    align-items: center;
    display: flex;
    justify-content: center;
  }
</style>
