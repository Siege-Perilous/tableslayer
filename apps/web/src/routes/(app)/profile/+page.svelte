<script lang="ts">
  import { ApiKeyManager, PartyInviteResponse, Head } from '$lib/components';
  import {
    Text,
    Title,
    Spacer,
    Panel,
    Avatar,
    FormControl,
    AvatarFileInput,
    Input,
    Button,
    FormError
  } from '@tableslayer/ui';
  import { useUpdateUserMutation, useUploadFileMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const user = $derived(data.user);
  const invites = $derived(data.invites);
  const apiKeys = $derived(data.apiKeys);

  let formIsLoading = $state(false);
  let name = $state(user.name);
  let email = $state(user.email);
  let newPassword = $state('');
  let newPasswordConfirm = $state('');
  let files = $state<FileList | null>(null);
  let avatarFileId: number | undefined = undefined;
  let updateProfileError = $state<FormMutationError | undefined>(undefined);

  const updateUser = useUpdateUserMutation();
  const uploadFile = useUploadFileMutation();

  const getCurrentAvatarLocation = () => {
    if (!user.thumb?.url) return undefined;
    const urlParts = user.thumb.url.split('?')[0].split('/');
    const fileName = urlParts[urlParts.length - 1];
    return `avatar/${fileName}`;
  };

  const handleUpdateUser = async (e: Event) => {
    e.preventDefault();
    if (newPassword !== '' && newPassword !== newPasswordConfirm) {
      updateProfileError = {
        status: 400,
        success: false,
        message: 'Check your form for errors',
        errors: [
          {
            path: ['newPasswordConfirm'],
            message: 'Passwords do not match',
            code: 'custom',
            input: newPasswordConfirm
          }
        ]
      };
      return;
    }
    await handleMutation({
      mutation: () =>
        updateUser.mutateAsync({
          userData: {
            name,
            email,
            avatarFileId
          },
          newPassword: newPassword !== '' ? newPassword : undefined
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => (updateProfileError = error),
      onSuccess: () => {
        updateProfileError = undefined;
        newPassword = '';
        newPasswordConfirm = '';
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Profile updated', body: 'Your profile has been updated' },
        error: { title: 'Error updating profile', body: (err) => err.message }
      }
    });
  };

  const unlinkGoogle = async () => {
    await handleMutation({
      mutation: () =>
        updateUser.mutateAsync({
          userData: {
            googleId: null
          }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => (updateProfileError = error),
      onSuccess: () => {
        updateProfileError = undefined;
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Google account unlinked', body: 'You can now only sign in with your email and password' },
        error: { title: 'Error unlinking Google account', body: (err) => err.message }
      }
    });
  };

  const avatarOnChange = async () => {
    if (files && files.length) {
      const uploadedFile = await handleMutation({
        mutation: () =>
          uploadFile.mutateAsync({
            file: files![0],
            folder: 'avatar',
            currentUrl: getCurrentAvatarLocation()
          }),
        formLoadingState: (loading) => (formIsLoading = loading),
        toastMessages: {
          success: { title: 'Image uploaded' },
          error: { title: 'Error uploading image', body: (error) => error.message }
        }
      });

      if (!uploadedFile) return;
      avatarFileId = uploadedFile.fileId;
    }

    await handleMutation({
      mutation: () =>
        updateUser.mutateAsync({
          userData: { avatarFileId }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => (updateProfileError = error),
      onSuccess: () => {
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Profile updated', body: 'Your profile has been updated' },
        error: { title: 'Error updating profile', body: (err) => err.message }
      }
    });
  };
</script>

<Head title={user.name} description={`${user.name} on Table Slayer`} />

<div class="profile">
  <div class="profile__header">
    <AvatarFileInput
      onChange={avatarOnChange}
      src={user.thumb.resizedUrl}
      size="xl"
      class="profile__avatar"
      bind:files
    />
    <Title as="h1" size="lg">{user.name}</Title>
  </div>

  <div class="profile__content">
    <section class="profile__section">
      <Title as="h2" size="sm">User details</Title>
      <Spacer size="0.5rem" />
      <Panel class="profile__panel">
        <form action="" onsubmit={handleUpdateUser}>
          <Spacer />
          <FormControl label="Name" name="name" errors={updateProfileError && updateProfileError.errors}>
            {#snippet input({ inputProps })}
              <Input {...inputProps} bind:value={name} hideAutocomplete />
            {/snippet}
          </FormControl>
          <Spacer />
          <FormControl label="Email" name="email" errors={updateProfileError && updateProfileError.errors}>
            {#snippet input({ inputProps })}
              <Input {...inputProps} bind:value={email} hideAutocomplete />
            {/snippet}
          </FormControl>
          <Spacer />
          <FormControl label="New password" name="newPassword" errors={updateProfileError && updateProfileError.errors}>
            {#snippet input({ inputProps })}
              <Input
                type="password"
                placeholder="Set new password"
                {...inputProps}
                bind:value={newPassword}
                hideAutocomplete
              />
            {/snippet}
          </FormControl>
          <Spacer />
          <FormControl
            label="Confirm new password"
            name="newPasswordConfirm"
            errors={updateProfileError && updateProfileError.errors}
          >
            {#snippet input({ inputProps })}
              <Input
                type="password"
                placeholder="Confirm new password"
                {...inputProps}
                bind:value={newPasswordConfirm}
                hideAutocomplete
              />
            {/snippet}
          </FormControl>
          <Spacer />
          <Button onclick={handleUpdateUser} disabled={formIsLoading}>Save</Button>
          <FormError error={updateProfileError} />
        </form>
      </Panel>

      {#if user.hasGoogle && data.envName !== 'preview'}
        <Spacer />
        <Panel class="profile__panel">
          <Spacer size="0.5rem" />
          <Text size="0.875rem" color="var(--fgMuted)">
            Your Google account is linked. You can unlink it to remove Google sign-in.
          </Text>
          <Spacer />
          <Button onclick={() => unlinkGoogle()}>
            {#snippet start()}
              <img src="/google.svg" alt="Google logo" width="16" height="16" />
            {/snippet}
            Unlink Google account
          </Button>
        </Panel>
      {/if}
    </section>

    <section class="profile__section">
      <ApiKeyManager {apiKeys} />
    </section>

    {#if invites.length > 0}
      <section class="profile__section">
        <Title as="h2" size="sm">Party invites</Title>
        <Spacer size="0.5rem" />
        <Panel class="profile__panel profile__invites">
          {#each invites as invite (invite.party.id)}
            <div class="profile__invite">
              <Avatar src={invite.invitedByUser?.thumb.resizedUrl} size="sm" />
              <div>
                <Text size="0.875rem" color="var(--fgMuted)">
                  <Text size="0.875rem" as="span" color="var(--fg)">
                    {invite.invitedByUser?.name || invite.invitedByUser?.email}
                  </Text> invited you to join
                </Text>
                <Title as="p" size="xs">{invite.party?.name}</Title>
                <Spacer />
                <PartyInviteResponse {invite} />
              </div>
            </div>
          {/each}
        </Panel>
      </section>
    {/if}
  </div>
</div>

<style>
  .profile {
    max-width: 600px;
    margin: var(--size-12) auto;
    padding: 0 var(--size-4);
  }

  .profile__header {
    display: flex;
    gap: 2rem;
    align-items: center;
    margin-bottom: 2rem;
  }

  .profile__content {
    display: flex;
    flex-direction: column;
    gap: var(--size-8);
  }

  .profile__section {
    display: flex;
    flex-direction: column;
  }

  :global(.profile__panel) {
    padding: 1rem;
    background: var(--bg);
    border-radius: var(--radius-2);
  }

  :global(.profile__invites) {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .profile__invite {
    display: flex;
    gap: 1rem;
    align-items: start;
  }
</style>
