<script lang="ts">
  import { page } from '$app/state';
  import { Title, Text } from '@tableslayer/ui';
  import { Head } from '$lib/components';
</script>

<Head />

<div class="error">
  <Title as="h1" size="xl">
    {page.status}
  </Title>
  <Text color="var(--fgMuted)" size="2rem">
    {page.error ? page.error.message : 'Something went wrong'}
  </Text>
</div>

<style>
  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
    position: relative;
    z-index: 5;
  }
  @media (max-width: 768px) {
    :global(.panel.error--login) {
      margin: 3rem 3rem auto 3rem;
    }
  }
</style>
