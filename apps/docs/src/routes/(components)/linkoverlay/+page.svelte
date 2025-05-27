<script lang="ts">
  import { LinkBox, LinkOverlay, Panel, Text, Title, Link, Spacer } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="LinkOverlay" propsName="LinkOverlay">
  <LinkBox as="div">
    <Panel class="panelLinkExample">
      <Title size="xs" as="h2">
        <LinkOverlay href="https://google.com">Overlay link for card</LinkOverlay>
      </Title>
      <Spacer size="0.5rem" />
      <Text>
        The entire card is link to the above title href, but the link below can still be selected. Both can be tabbed
        to.
      </Text>
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
