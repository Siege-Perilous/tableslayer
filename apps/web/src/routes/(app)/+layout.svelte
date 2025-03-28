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
    IconFileDescription
  } from '@tabler/icons-svelte';
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
  let headerContainerClasses = $derived(['headerContainer', gameSession && 'headerContainer--isSession']);

  const handleChangeParty = (selected: string) => {
    goto(`/${selected}`);
  };

  const links = [
    { label: 'Help', href: '/help', icon: IconQuestionMark },
    { label: 'Bluesky', href: 'https://bsky.app/profile/davesnider.com', icon: IconBrandBluesky },
    {
      label: 'Discord',
      href: 'https://discord.com/channels/1346472596887179390/1346472597663121420',
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
        <Link href={`/${selectedParty.slug}/${gameSession.slug}`} color="fg" class="gameSessionLink">
          {gameSession.name}
        </Link>
      {/if}
    </div>

    <div class="headerContainer__section">
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
                  <Link href="/profile">Manage profile</Link>
                  <Spacer size={1} />
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
                <Spacer size={2} />
                <Link href="/verify-email">Verify your email</Link>
              </div>
            {/if}
            <Spacer />
            <Hr />
            <Spacer size={2} />
            {#each links as link}
              <a href={link.href} class="profileDropdown__link" target="_blank">
                <Text size="0.875rem">{link.label}</Text>
                <Icon Icon={link.icon} size="1.25rem" />
              </a>
            {/each}
            <Spacer size={2} />
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
  .gameSessionLink {
    display: none;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  @media (max-width: 768px) {
    .partyDropdown__text {
      display: none;
    }
  }
</style>
