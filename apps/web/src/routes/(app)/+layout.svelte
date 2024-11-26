<script lang="ts">
  import { AvatarPopover, DropdownRadioMenu, Button, Title, Link, IconButton, Icon } from '@tableslayer/ui';
  import { IconMoon, IconSun } from '@tabler/icons-svelte';
  import { toggleMode, mode } from 'mode-watcher';
  let { data, children } = $props();
  const { user, parties } = data;
  import { IconSelector } from '@tabler/icons-svelte';
  import { page } from '$app/stores';
  import classNames from 'classnames';

  let menuItems = $derived(
    parties?.map((party) => ({
      label: party.name,
      value: party.slug,
      href: `/${party.slug}`
    }))
  );
  let selectedParty = $derived(parties.find((party) => party.slug === $page.params.party));
  const gameSession = $derived($page.data.gameSession);
  let headerContainerClasses = $derived(classNames('header_container', gameSession && 'header_container--isSession'));
</script>

<header>
  <div class={headerContainerClasses}>
    <div class="header_container__section">
      <a href="/">
        <div class="logo">
          <Title as="p" size="sm">TS</Title>
        </div>
      </a>

      {#if parties.length > 0}
        <div class="partyDropdown">
          {#if selectedParty !== undefined}
            <Link href={`/${selectedParty.slug}`} color="fg">{selectedParty.name}</Link>
          {:else}
            Choose a party
          {/if}
          <DropdownRadioMenu items={menuItems} defaultItem={menuItems[0]}>
            {#snippet trigger()}
              <div class="partyDropdown__icon">
                <Icon Icon={IconSelector} />
              </div>
            {/snippet}
            {#snippet footer()}
              <div class="partyDownDropdown__footer">
                <Link href="/create-party">Create a new party</Link>
              </div>
            {/snippet}
          </DropdownRadioMenu>
        </div>
      {/if}
      {#if gameSession && selectedParty}
        <Link href={`/${selectedParty.slug}/${gameSession.slug}`} color="fg">{gameSession.name}</Link>
      {/if}
    </div>

    <div class="header_container__section">
      <IconButton onclick={toggleMode} variant="ghost" title="Toggle theme">
        <Icon Icon={$mode === 'dark' ? IconSun : IconMoon} size={16} stroke={2} />
      </IconButton>
      <AvatarPopover src={user.avatarThumb.resizedUrl || user.avatarThumb.url}>
        {#snippet content()}
          <div class="dropdown">
            <Link href="/profile">{user.name || user.email}</Link>
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
  .header_container--isSession {
    justify-content: space-between;
    max-width: 100%;
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
  .partyDropdown__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--size-2);
  }
  .partyDropdown__icon:hover {
    background: var(--contrastLow);
    border-radius: var(--radius-2);
  }
  .partyDownDropdown__footer {
    padding-left: 2.75rem;
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
