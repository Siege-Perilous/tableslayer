<script lang="ts">
  import { Title, Spacer, Panel, Text, Link } from '@tableslayer/ui';
  import { Head } from '$lib/components';
  import { page } from '$app/state';

  const error = $derived(page.url.searchParams.get('error'));
  const message = $derived.by(() => {
    switch (error) {
      case 'expired-code':
        return 'This password reset link has expired.';
      case 'wrong-user':
        return 'You are logged in as a different user than the one this reset link was sent to.';
      default:
        return 'This password reset link is not valid. It may have already been used.';
    }
  });
</script>

<Head title="Invalid reset link" />

<Panel class="panel--resetInvalid">
  <Title as="h1" size="md">Invalid reset link</Title>
  <Spacer size="2rem" />
  <Text>{message}</Text>
  <Spacer />
  <Text>
    You can <Link href="/forgot-password">request a new reset link</Link> or return to
    <Link href="/login">sign in</Link>.
  </Text>
</Panel>

<style>
  :global(.panel.panel--resetInvalid) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
</style>
