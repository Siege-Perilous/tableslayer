<script lang="ts">
  import { dev } from '$app/environment';
  import { Text, Spacer, Button, Panel, Hr } from '@tableslayer/ui';
  let { data } = $props();
  const { user } = data;
  import { IllustrationOverlook, Logo, Head } from '$lib/components';
  import { Input, FormControl } from '@tableslayer/ui';
  import { useAddEmailToAudienceMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  let email = $state('');
  let formIsLoading = $state(false);
  let formError = $state<FormMutationError | undefined>(undefined);
  let formCompleted = $state(false);

  const addEmailToAudience = useAddEmailToAudienceMutation();

  const handleAddEmailToAudience = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => $addEmailToAudience.mutateAsync({ email }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => {
        formError = error;
      },
      onSuccess: () => {
        formCompleted = true;
      },
      toastMessages: {
        success: { title: 'Thanks!', body: "We'll be in touch soon." },
        error: { title: 'Error', body: (error) => error.message }
      }
    });
  };
</script>

<Head title="Table Slayer" description="Tools to create animated battle maps for in person RPG games." />

<IllustrationOverlook />

<Panel class="panel--home">
  <Logo class="logo" />
  <Spacer size={8} />
  <Text size="1.5rem">Tools to create animated battle maps for in person RPG games.</Text>
  <Spacer />
  <Hr />
  <Spacer size={8} />
  {#if user}
    <div>
      <Button href="/profile" class="btn">Dashboard</Button>
    </div>
  {:else if dev}
    <div class="flex">
      <Button href="/login" class="btn">Log in</Button>
      <Button href="/signup" class="btn">Sign up</Button>
    </div>
  {:else if !formCompleted}
    <Text color="var(--fgMuted)">Interested in joining the beta? Sign up for updates.</Text>
    <Spacer size={4} />
    <form onsubmit={handleAddEmailToAudience}>
      <FormControl label="Email" name="email" errors={formError && formError.errors}>
        {#snippet input({ inputProps })}
          <Input {...inputProps} type="email" bind:value={email} data-testid="email" />
        {/snippet}
      </FormControl>
      <Spacer />
      <Button data-testid="notifySubmit" type="submit" disabled={formIsLoading} isLoading={formIsLoading}>
        Add me to the beta
      </Button>
    </form>
  {:else}
    <Text size="1.5rem" color="var(--fgPrimary)">Thanks. We'll be in touch soon.</Text>
  {/if}
</Panel>

<style>
  :global(.title.heroTitle) {
    font-size: 4rem;
    line-height: 1.2;
    font-weight: 900;
    width: fit-content;
    /*  color: transparent;  */
    /*  background-clip: text;  */
    /*  background-image: linear-gradient(0deg, rgba(122, 5, 5, 1) 0%, rgba(223, 5, 5, 1) 35%, rgba(255, 0, 50, 1) 100%);  */
    /*  text-shadow:  */
    /*  2px 2px 0 rgba(255, 255, 255, 0.2),  */
    /*  -1px 0 0 rgba(255, 255, 255, 1);  */
  }
  :global {
    .panel.panel--home {
      display: flex;
      flex-direction: column;
      width: fit-content;
      max-width: 480px;
      padding: 3rem;
      margin: 20vh auto auto 10vh;
      position: relative;
      z-index: 5;
    }
    .logo {
      width: 392px;
      max-width: 100%;
      margin: 0 auto;
      color: var(--fg);
    }
  }
  .flex {
    display: flex;
    gap: var(--size-4);
  }
  :global(.heroTitle) {
    letter-spacing: 0.2rem;
  }

  @media (max-width: 768px) {
    :global(.panel.panel--home) {
      margin: 3rem 3rem auto 3rem;
    }
  }
</style>
