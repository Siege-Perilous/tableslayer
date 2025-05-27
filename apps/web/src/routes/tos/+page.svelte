<script lang="ts">
  import { Link, Text, Spacer, Title } from '@tableslayer/ui';

  import { Logo, Head } from '$lib/components';
</script>

<Head title="Terms of service" description="Terms of service for Table Slayer" />

<div class="container">
  <a href="/" class="termsLogo">
    <Logo />
  </a>
  <Title as="h2" size="md">Terms of Service</Title>
  <Spacer size="0.5rem" />
  <Text>Table Slayer believes in a simple, easy to read Terms of Service.</Text>
  <ul class="terms">
    <li>
      Table Slayer does not actively track you for analytic or sales purposes. We monitor server requests in aggregate
      to prevent bugs.
    </li>
    <li>Table Slayer will never sell your data to a third party.</li>
    <li>
      Table Slayer will never change its <Link href="https://github.com/Siege-Perilous/tableslayer">
        open source license
      </Link>.
    </li>
    <li>
      Table Slayer may occassionally need to send you an email about a service disruption or major feature change.
    </li>
    <li>
      Table Slayer does not have a crystal ball. We may add optional features that require payment beyond the liftime
      subscription.
    </li>
    <li>
      Table Slayer is not responsible for any data loss or service disruption. We are responsible for making a good
      faith effort to keep the service running with proper backups.
    </li>
    <li>Don't be a jerk. You are responsible for the content you upload and share within Table Slayer.</li>
    <li>Table Slayer may terminate your account at any time for any reason if you are a jerk.</li>
  </ul>
</div>

<style>
  .termsLogo {
    display: block;
    width: 400px;
    max-width: 100%;
    height: auto;
    margin: auto;
    margin-bottom: 4rem;
  }
  .terms {
    list-style: none;
    margin-left: 2rem;
  }
  .terms li {
    margin: 0.5rem 0;
    list-style: disc;
    padding: 0.25rem;
  }
  .container {
    max-width: 800px;
    padding: 4rem;
    margin: auto;
  }
</style>
