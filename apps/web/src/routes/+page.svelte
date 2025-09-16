<script lang="ts">
  import { Text, Spacer, Button, Link, Title } from '@tableslayer/ui';
  import { Head } from '$lib/components';
</script>

<Head
  title="Table Slayer"
  description="Table Slayer helps game masters build and manage animated battle maps for in person RPG games on a TV."
/>

<div class="home__demo">
  <div class="grid"></div>
  <img
    srcset="https://files.tableslayer.com/illustrations/home/title.png 1x, https://files.tableslayer.com/illustrations/home/title-2x.png 2x"
    alt="Overlook illustration"
    class="home__wizard"
    height="440"
    width="700"
  />
</div>
<div class="home__content">
  <div>
    <div class="home__video">
      <video
        src="https://files.tableslayer.com/illustrations/home/tsdemo.mp4"
        autoplay
        loop
        muted
        playsinline
        class="home__videoPlayer"
        controls
      >
        Your browser does not support the video tag.
      </video>
    </div>
  </div>
  <div>
    <Text size="1.25rem" class="home__contentText">
      Table Slayer helps game masters build and manage animated battle maps for <span class="home__highlight">
        in person
      </span>
      RPG games on a TV. It provides tools to switch scenes, edit a fog of war, change the time of day, and add weather effects.
      If you've used Google Slides, you already know how to use Table Slayer.
    </Text>
    <Spacer />
    <Text color="var(--fgMuted)">
      Table Slayer's code is <Link href="https://github.com/Siege-Perilous/tableslayer">open source</Link> and free to host
      for personal use. View the <Link href="/changelog">changelog</Link> to see what's new.
    </Text>
    <Spacer size="2rem" />
    <div class="home__buttonGroup">
      <Button href="/signup" class="btn" variant="special" size="lg">Try it for free</Button>
      <Button href="/login" class="btn" size="lg">Log in</Button>
    </div>
  </div>
</div>

<div class="home__title">
  <Title size="md" as="h2">Turn any cheap television into an animated battlemap.</Title>
</div>

<div class="home__features">
  <div>
    <img
      srcset="https://files.tableslayer.com/illustrations/home/laptop.png 1x, https://files.tableslayer.com/illustrations/home/laptop-2x.png 2x"
      alt="Laptop illustration"
      class="home__featureImage"
      height="339"
      width="562"
    />
    <Text size="1.25rem" class="home__featureText">
      Table Slayer runs in a web browser. The most common setup is a laptop connected via HDMI, using the TV for the map
      display, and the laptop screen for the game master controls.
    </Text>
  </div>
  <div>
    <img
      srcset="https://files.tableslayer.com/illustrations/home/hand.png 1x, https://files.tableslayer.com/illustrations/home/hand-2x.png 2x"
      alt="Cloud illustration"
      class="home__featureImage"
      height="339"
      width="562"
    />
    <Text size="1.25rem" class="home__featureText">
      A more optimal setup with less clutter is to drive the game master tools with a touch capable tablet or phone, and
      use a raspberry pi or mini-pc device to run the TV display.
    </Text>
  </div>
</div>
<div class="home__title">
  <Title size="md" as="h2">Frequently asked questions</Title>
</div>
<div class="home__questions">
  <div>
    <Title size="sm" as="h3">Is Table Slayer free?</Title>
    <Text>
      Table Slayer is free to use for personal use if you <Link href="https://github.com/Siege-Perilous/tableslayer">
        host it yourself
      </Link>. Most instead use this website to host their games. Lifetime, unlimited usage is available for
      <span class="home__highlight">$85 USD</span>
      . There is also a limited free plan, and a
      <span class="home__highlight">$5 monthly subscription</span>
      .
    </Text>
  </div>
  <div>
    <Title size="sm" as="h3">Do I need an Internet connection?</Title>
    <Text>Yes. Table Slayer requires an Internet connection and a web browser to run.</Text>
  </div>
  <div>
    <Title size="sm" as="h3">How does it compare to other VTTs?</Title>
    <Text>
      Table Slayer is purpose built for live play with a television and miniatures. It is built for speed and can be
      learned organically in about 5 minutes.
    </Text>
  </div>
  <div>
    <Title size="sm" as="h3">Do my players need accounts?</Title>
    <Text>
      No. Only the game master needs an account. Your players simply sit at the table and play like they would in a pen
      and paper setup.
    </Text>
  </div>
  <div>
    <Title size="sm" as="h3">Where do I get maps?</Title>
    <Text>
      We do not provide maps. There are thousands of free battle maps available online. Table Slayer works best with
      ungridded map images or mp4 videos.
    </Text>
  </div>
  <div>
    <Title size="sm" as="h3">Who runs Table Slayer?</Title>
    <Text>
      <Link href="https://davesnider.com">Dave Snider</Link> builds and maintains Table Slayer as independent, open source
      software. Feel free to reach out by
      <Link href="mailto:dave@tableslayer.com">email</Link>, <Link href="https://bsky.app/profile/davesnider.com">
        Bluesky
      </Link>, or <Link href="https://discord.gg/BaNqz5yncd">Discord</Link>.
    </Text>
  </div>
</div>

<div class="home__tos">
  <Text size="0.875rem" color="var(--fgMuted)">
    Table Slayer does not collect any personal information. You can read the
    <Link href="/tos">Terms of Service</Link> for more details.
  </Text>
</div>

<style>
  .home__wizard {
    max-width: 700px;
    height: auto;
    display: block;
    margin: 2rem auto 0 auto;
  }
  .home__demo {
    position: relative;
  }
  .home__content {
    width: 80%;
    max-width: 1200px;
    position: relative;
    background: var(--contrastLowest);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-1);
    margin: 0 auto;
    padding: 2rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 4rem;
  }
  @media (max-width: 768px) {
    :global(.panel.panel--home) {
      margin: 3rem 3rem auto 3rem;
    }
  }
  .grid {
    position: absolute;
    pointer-events: none;
    inset: 0;
    height: 100%;
    width: 100%;
    background-image:
      linear-gradient(to right, #b2b2b212 1px, transparent 1px),
      linear-gradient(to bottom, #b2b2b212 1px, transparent 1px);
    background-size: 28px 28px;
    -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 0%, transparent 100%);
    mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 0%, transparent 100%);
  }
  .home__videoPlayer {
    width: 100%;
    aspect-ratio: 16 / 9;
    height: auto;
  }
  .home__features {
    width: 80%;
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    grid-auto-rows: 1fr;
  }
  .home__features > div {
    background: var(--contrastLowest);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-1);
  }
  .home__featureImage {
    width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  .home__highlight {
    font-weight: 800;
    color: var(--fg);
    text-decoration: underline;
    text-decoration-style: dashed;
    text-decoration-color: var(--fgMuted);
  }
  .home__title {
    width: 80%;
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
    padding: 4rem;
  }
  .home__buttonGroup {
    display: flex;
    gap: 1rem;
  }
  .home__questions {
    width: 80%;
    max-width: 1200px;
    margin: 0 auto 4rem auto;
    padding: 2rem;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4rem;
  }
  :global(.home__featureText) {
    padding: 2rem;
  }
  :global(.home__contentText) {
    text-wrap: pretty;
  }
  .home__tos {
    width: 80%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
    margin-bottom: 4rem;
  }
  @media (max-width: 768px) {
    .home__questions {
      width: 90%;
    }
    .home__content {
      width: 90%;
    }
    .home__features {
      width: 90%;
    }
    .home__wizard {
      max-width: 100%;
    }
    .home__content {
      grid-template-columns: 1fr;
    }
    .home__features {
      grid-template-columns: 1fr;
    }
    .home__questions {
      grid-template-columns: 1fr;
    }
  }
</style>
