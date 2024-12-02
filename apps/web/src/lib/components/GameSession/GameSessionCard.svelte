<script lang="ts">
  import { LinkBox, Panel, CardFan, Title, Text, Link, LinkOverlay } from '@tableslayer/ui';
  import type { SuperValidated } from 'sveltekit-superforms/client';
  import type { DeleteGameSessionFormType } from '$lib/schemas';
  import type { SelectGameSession, SelectParty } from '$lib/db';
  import type { AvatarThumb } from '$lib/server';

  let {
    party,
    session,
    deleteGameSessionForm
  }: {
    party: SelectParty & AvatarThumb;
    session: SelectGameSession;
    deleteGameSessionForm: SuperValidated<DeleteGameSessionFormType>;
  } = $props();

  const images = [
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/01.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/02.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/03.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/04.jpeg',
    'https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,h=200/maps/12.jpeg'
  ];
</script>

<LinkBox>
  <Panel class="sessionPanel">
    <div
      class="cardFan__image"
      style="
      background-image: linear-gradient(rgba(0, 0, 0, 0), var(--contrastLowest) 50%), url('https://files.tableslayer.com/cdn-cgi/image/fit=scale-down,w=400/maps/01.jpeg');"
    ></div>
    <CardFan {images} class="cardFan--sessionList" />
    <div>
      <Title as="h3" size="sm">
        <LinkOverlay href={`${party.slug}/${session.slug}`}>
          <Link as="span">
            {session.name}
          </Link>
        </LinkOverlay>
      </Title>
      <Text>Last edited: {new Date().toLocaleDateString()}</Text>
    </div>
  </Panel>
</LinkBox>

<style>
  :global {
    .panel.sessionPanel {
      padding: var(--size-4);
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 2rem;
      height: 100%;
      transition: border-color 0.2s var(--ease-in-2);
    }
    .panel.sessionPanel:hover {
      border-color: var(--fgPrimary);
    }
    .panel.sessionPanel:hover .cardFan__image {
      background-size: 105%;
    }
    .cardFan--sessionList {
      margin: 0 auto;
    }
  }
  .cardFan__image {
    background-size: 100%;
    background-position: center;
    filter: grayscale(0.5);
    opacity: 0.3;
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    width: calc(100% - 1rem);
    border-radius: 0.25rem;
    height: calc(100% - 1rem);
    transition: background-size 0.2s var(--ease-in-2);
  }
</style>
