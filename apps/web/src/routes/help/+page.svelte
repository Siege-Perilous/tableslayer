<script lang="ts">
  import { Link, Text, Spacer, Title, Icon } from '@tableslayer/ui';

  import { Logo, Head } from '$lib/components';
  import { IconBrandBluesky, IconBrandGithub, IconBrandDiscord, IconMail } from '@tabler/icons-svelte';

  const links = [
    { label: 'Email', href: 'mailto:dave@tableslayer.com', icon: IconMail },
    { label: 'Bluesky', href: 'https://bsky.app/profile/davesnider.com', icon: IconBrandBluesky },
    {
      label: 'Discord',
      href: 'https://discord.com/channels/1346472596887179390/1346472597663121420',
      icon: IconBrandDiscord
    },
    { label: 'GitHub', href: 'https://github.com/siege-perilous/tableslayer', icon: IconBrandGithub }
  ];
</script>

<Head title="Help" description="Frequently asked questions about Table Slayer." />

<div class="container">
  <a href="/" class="helpLogo">
    <Logo />
  </a>
  <Title as="h2" size="sm">Have a question?</Title>
  <Spacer size="0.5rem" />
  <Text>You can reach out via any of the following methods:</Text>
  <ul>
    {#each links as link}
      <li>
        <a href={link.href} class="helpLink">
          <Text size="0.875rem">{link.label}</Text>
          <Icon Icon={link.icon} size="1.25rem" />
        </a>
      </li>
    {/each}
  </ul>
  <Spacer size="2rem" />
  <Title as="h2" size="sm">Is Table Slayer really Open Source?</Title>
  <Spacer size="0.5rem" />
  <Text>
    Yes! Table Slayer is open source and available on <Link href="https://github.com/siege-perilous/tableslayer">
      GitHub
    </Link>. You are free to host it for your own personal use.
  </Text>
  <Spacer size="2rem" />
  <Title as="h2" size="sm">Is Table Slayer multiplayer?</Title>
  <Spacer size="0.5rem" />
  <Text>
    No, Table Slayer is primarily a tool for the Game Master (GM) alone. It is meant to be used for in person games. We
    have no intention of competing with Virtual Table Tops, which require a lot more features to allow online play.
    Consider Table Slayer a Live Table Top (LTT).
  </Text>
  <Spacer size="2rem" />
  <Title as="h2" size="sm">Why does Table Slayer require a subscription?</Title>
  <Spacer size="0.5rem" />
  <Text>
    No one is getting rich off Table Slayer. The price is set to cover the costs of continued development from a single
    developer. This is a niche product, with surprisngly complex technical challenges. If you are averse to subscription
    pricing, the lifetime fee is a reasonable way to avoid it.
  </Text>
  <Spacer size="2rem" />
  <Title as="h2" size="sm">Why are subscriptions at the Party level?</Title>
  <Spacer size="0.5rem" />
  <Text>
    It is very common for RPG games to switch their lineup of players over time. We wanted to make it easy to take over
    an existing game by switching out the admin.
  </Text>
  <Spacer size="2rem" />
  <Title as="h2" size="sm">What do I need to run Table Slayer?</Title>

  <Spacer size="0.5rem" />
  <Text>
    At a minimum, you need a device with a browser (desktop, laptop, tablet or phone) and a TV or monitor to display the
    playfield. Some televisions have built-in browsers, but we recommend using a dedicated device for the best
    experience.
  </Text>
  <Spacer size="2rem" />
  <Title as="h2" size="sm">How should I use Table Slayer with my TV?</Title>
  <Spacer size="0.5rem" />
  <Text>
    There are two ways people tend to run Table Salyer. The most common is to use a laptop with an HDMI cable that you
    attach to your TV, which you treat as a second monitor. Then you drag the playfield browser to the TV screen and
    make it full screen.
  </Text>
  <Spacer size="1rem" />
  <Text>
    The second, less cluttered way, is to run Table Slayer's editor on a tablet or phone, and run the playfield on a
    seperate dedicated device like a mini-pc / mac mini or Rasberry Pi. The playfield will update as you make changes.
  </Text>
  <Spacer size="2rem" />
  <Title as="h2" size="sm">What are Table Slayer's limitations?</Title>
  <Spacer size="1rem" />
  <Text>
    Table Slayer is meant to have one editor (the editor) and one playfield (the TV or monitor) running at any one. The
    updates are not currently bidirectional, and if you have multiple editors running, you might need to occassionally
    run a browser refresh occassionally. time.
  </Text>
  <Spacer size="2rem" />
  <Title as="h2" size="sm">Why would I invite others into my party?</Title>
  <Spacer size="1rem" />
  <Text>
    In the future, Table Slayer will have a messaging system that allows you to schedule your in person games. The
    hardest part of playing RPG games is getting people to show up regularly. These tools are currently being built.
    Until then, there is little need to invite others into your party unless you plan on sharing GM duties.
  </Text>
</div>

<style>
  .helpLogo {
    display: block;
    width: 400px;
    max-width: 100%;
    height: auto;
    margin: auto;
    margin-bottom: 4rem;
  }
  ul {
    list-style: none;
    margin-left: 2rem;
  }
  li {
    margin: 0.5rem 0;
    list-style: disc;
  }
  li:hover {
    text-decoration: underline;
  }
  .helpLink {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .container {
    max-width: 800px;
    padding: 4rem;
    margin: auto;
  }
</style>
