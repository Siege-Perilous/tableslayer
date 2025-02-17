<script lang="ts">
  import {
    AvatarPopover,
    SelectorMenu,
    Button,
    Title,
    Link,
    IconButton,
    Icon,
    Hr,
    Spacer,
    Text,
    LinkBox,
    LinkOverlay,
    Avatar
  } from '@tableslayer/ui';
  import { IconMoon, IconSun } from '@tabler/icons-svelte';
  import { toggleMode, mode } from 'mode-watcher';
  let { data, children } = $props();
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  let parties = $derived(data.parties);

  let menuItems = $derived(
    parties?.map((party) => ({
      label: party.name,
      value: party.slug,
      href: `/${party.slug}`
    })) || []
  );
  let selectedParty = $derived(parties && parties.find((party) => party.slug === page.params.party));
  const gameSession = $derived(page.data.gameSession);
  let headerContainerClasses = $derived(['header_container', gameSession && 'header_container--isSession']);

  const handleChangeParty = (selected: string) => {
    console.log('Selected party:', selected);
    goto(`/${selected}`);
  };
</script>

<header>
  <div class={headerContainerClasses}>
    <div class="header_container__section">
      <a href="/">
        <div class="logo">
          <Title as="p" size="sm">TS</Title>
        </div>
      </a>

      {#if parties && parties.length > 0}
        <div class="partyDropdown">
          <div class="partyDropdown__text">
            {#if selectedParty !== undefined}
              <Link href={`/${selectedParty.slug}`} color="fg">{selectedParty.name}</Link>
            {:else}
              Choose a party
            {/if}
          </div>
          <SelectorMenu
            options={menuItems}
            onSelectedChange={(selected) => handleChangeParty(selected)}
            positioning={{ placement: 'bottom', offset: 10 }}
            selected={selectedParty ? selectedParty.slug : undefined}
          >
            {#snippet footer({ footerProps })}
              <Spacer size={2} />
              <Hr />
              <div class="partyDownDropdown__footer">
                <Link href="/create-party" onclick={footerProps.close}>Create a new party</Link>
              </div>
            {/snippet}
          </SelectorMenu>
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
      <AvatarPopover
        src={data.user.thumb.resizedUrl || data.user.thumb.url}
        positioning={{ placement: 'bottom-end', gutter: 10 }}
      >
        {#snippet content()}
          <div class="profileDropdown">
            <LinkBox>
              <div class="profileDropdown__user">
                <Avatar
                  src={data.user.thumb.resizedUrl || data.user.thumb.url}
                  alt={data.user.name}
                  size="lg"
                  initials={data.user.name}
                />
                <div>
                  <Link href="/profile">{data.user.name}</Link>
                  <Spacer size={1} />
                  <LinkOverlay href="/profile">{data.user.email}</LinkOverlay>
                </div>
              </div>
            </LinkBox>
            {#if !data.user.emailVerified}
              <Spacer />
              <Hr />
              <Spacer />
              <div>
                <Text size="0.875rem" color="var(--fgMuted)">Your email is not verified.</Text>
                <Spacer size={2} />
                <Link href="/verify-email">Verify your email</Link>
              </div>
            {/if}
            <Spacer />
            <Hr />
            <Spacer />
            <div>
              <Button href="/logout" variant="danger" data-sveltekit-preload-data="tap">logout</Button>
            </div>
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
  .profileDropdown {
    display: block;
    min-width: 12rem;
    padding: 0.25rem;
  }
  .profileDropdown__user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .partyDropdown {
    display: flex;
    gap: var(--size-2);
    align-items: center;
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
    padding: 0.5rem 1rem 0.5rem 2.75rem;
  }
  .partyDropdown__text {
    white-space: nowrap;
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
