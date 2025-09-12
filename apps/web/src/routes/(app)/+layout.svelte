<script lang="ts">
  import {
    AvatarPopover,
    SelectorMenu,
    Button,
    Link,
    IconButton,
    Icon,
    Hr,
    Spacer,
    Text,
    LinkBox,
    LinkOverlay,
    Avatar,
    Logo
  } from '@tableslayer/ui';
  import {
    IconMoon,
    IconSun,
    IconQuestionMark,
    IconBrandBluesky,
    IconBrandDiscord,
    IconBrandGithub,
    IconFileDescription,
    IconConfetti
  } from '@tabler/icons-svelte';
  import { toggleMode, mode } from 'mode-watcher';
  import type { SelectGameSession } from '$lib/db/app/schema';
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
  const gameSessions = $derived(page.data.gameSessions);
  let headerContainerClasses = $derived(['headerContainer', gameSession && 'headerContainer--isSession']);

  let gameSessionMenuItems = $derived(
    gameSessions?.map((session: SelectGameSession) => ({
      label: session.name,
      value: session.slug,
      href: `/${selectedParty?.slug}/${session.slug}`
    })) || []
  );

  const handleChangeParty = (selected: string) => {
    goto(`/${selected}`);
  };

  const handleChangeGameSession = (selected: string) => {
    // Use window.location for hard navigation to avoid complex state issues
    const selectedSession = gameSessions?.find((s: SelectGameSession) => s.slug === selected);
    if (selectedSession && selectedParty) {
      window.location.href = `/${selectedParty.slug}/${selectedSession.slug}`;
    }
  };

  const links = [
    { label: 'Product updates', href: '/changelog', icon: IconConfetti },
    { label: 'Help', href: '/help', icon: IconQuestionMark },
    { label: 'Bluesky', href: 'https://bsky.app/profile/davesnider.com', icon: IconBrandBluesky },
    {
      label: 'Discord',
      href: 'https://discord.gg/BaNqz5yncd',
      icon: IconBrandDiscord
    },
    { label: 'GitHub', href: 'https://github.com/siege-perilous/tableslayer', icon: IconBrandGithub },
    { label: 'Terms of service', href: '/tos', icon: IconFileDescription }
  ];
</script>

<header>
  <div class={headerContainerClasses}>
    <div class="headerContainer__section">
      <a href="/">
        <Logo size={24} />
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
              <Spacer size="0.5rem" />
              <Hr />
              <div class="partyDownDropdown__footer">
                <Link href="/create-party" onclick={footerProps.close}>Create a new party</Link>
              </div>
            {/snippet}
          </SelectorMenu>
        </div>
      {/if}

      {#if selectedParty && gameSessions && gameSessions.length > 0}
        <div class="gameSessionDropdown">
          <div class="gameSessionDropdown__text">
            {#if gameSession}
              <Text>{gameSession.name}</Text>
            {/if}
          </div>
          {#if gameSession}
            <SelectorMenu
              options={gameSessionMenuItems}
              onSelectedChange={(selected) => handleChangeGameSession(selected)}
              positioning={{ placement: 'bottom', offset: 10 }}
              selected={gameSession ? gameSession.slug : undefined}
            />
          {/if}
        </div>
      {/if}
    </div>

    <div class="headerContainer__section">
      <IconButton onclick={toggleMode} variant="ghost" title="Toggle theme">
        <Icon Icon={mode.current === 'dark' ? IconSun : IconMoon} size={16} stroke={2} />
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
                  <Link href="/profile">Manage profile</Link>
                  <Spacer size="0.25rem" />
                  <LinkOverlay href="/profile"><Text size="0.875rem">{data.user.email}</Text></LinkOverlay>
                </div>
              </div>
            </LinkBox>
            {#if !data.user.emailVerified}
              <Spacer />
              <Hr />
              <Spacer />
              <div>
                <Text size="0.875rem" color="var(--fgMuted)">Your email is not verified.</Text>
                <Spacer size="0.5rem" />
                <Link href="/verify-email">Verify your email</Link>
              </div>
            {/if}
            <Spacer />
            <Hr />
            <Spacer size="0.5rem" />
            {#each links as link}
              <a href={link.href} class="profileDropdown__link" target="_blank">
                <Text size="0.875rem">{link.label}</Text>
                <Icon Icon={link.icon} size="1.25rem" />
              </a>
            {/each}
            <Spacer size="0.5rem" />
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
  .headerContainer {
    max-width: var(--contain-desktop);
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .headerContainer--isSession {
    justify-content: space-between;
    max-width: 100%;
  }
  .headerContainer__section {
    display: flex;
    align-items: center;
    gap: var(--size-4);
    white-space: nowrap;
    max-width: calc(100% - 100px);
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
  .gameSessionDropdown {
    display: flex;
    gap: var(--size-2);
    align-items: center;
  }
  .gameSessionDropdown__text {
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

  .profileDropdown__link {
    display: flex;
    gap: 0.5rem;
    text-align: left;
    white-space: nowrap;
    justify-content: space-between;
    width: 100%;
    padding: 0.25rem 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    gap: 0.5rem;
    gap: 1rem;
  }

  .profileDropdown__link:hover,
  .profileDropdown__link:focus-visible {
    text-decoration: underline;
  }
  @media (max-width: 768px) {
    .partyDropdown__text,
    .gameSessionDropdown__text {
      display: none;
    }
  }
</style>
