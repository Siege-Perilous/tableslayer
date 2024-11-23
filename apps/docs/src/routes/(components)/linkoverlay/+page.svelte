<script lang="ts">
  import { LinkBox, LinkOverlay, Panel, Text, Title, Link, Spacer } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Avatar" propsName="Avatar">
  <LinkBox as="div">
    <Panel class="panelLinkExample">
      <Title size="xs">
        <LinkOverlay href="https://google.com">Overlay link for card</LinkOverlay>
      </Title>
      <Spacer size={2} />
      <Text
        >The entire card is link to the above title href, but the link below can still be selected. Both can be tabbed
        too.</Text
      >
      <Spacer />
      <Link href="#">Non overlay link</Link>
    </Panel>
  </LinkBox>
</Example>

<style>
  :global {
    .panelLinkExample {
      max-width: 20rem;
      padding: 1rem;
    }
    .panelLinkExample:hover {
      border-color: var(--fgPrimary);
    }
  }
</style>
