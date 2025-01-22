<script lang="ts">
  import { page } from '$app/state';
  import { IllustrationOverlook } from '$lib/components';
  import { Panel, Title, Text } from '@tableslayer/ui';
  console.log(page);
</script>

<IllustrationOverlook />

<Panel class="error">
  <Title as="h1" size="md" data-testid="signInHeading">
    {page.status}
  </Title>
  <Text>
    {page.error.message}
  </Text>
</Panel>

<style>
  :global(.panel.error) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto 10vh;
    position: relative;
    z-index: 5;
  }
  @media (max-width: 768px) {
    :global(.panel.error--login) {
      margin: 3rem 3rem auto 3rem;
    }
  }
</style>
