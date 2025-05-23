<script lang="ts">
  import { Text, Title, Spacer, Panel } from '@tableslayer/ui';
  import { Head } from '$lib/components';
</script>

<Panel class="panel--forgot">
  <Title as="h1" size="md">Check your email</Title>
  <Spacer size="1rem" />
  <Text>We've sent you an email with a link to reset your password. If you don't see it, check your spam folder.</Text>
</Panel>

<Head title="Confirm" description="Check your email to reset your password" />

<style>
  :global(.panel.panel--forgot) {
    display: flex;
    flex-direction: column;
    max-width: var(--contain-smallForm);
    padding: var(--size-8);
    margin: 20vh auto auto auto;
  }
</style>
