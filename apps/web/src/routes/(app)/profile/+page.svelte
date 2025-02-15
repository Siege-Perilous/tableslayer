<script lang="ts">
  import { GameSessionCard, PartyInviteResponse } from '$lib/components';
  import {
    Text,
    Title,
    Spacer,
    Icon,
    Panel,
    Avatar,
    LinkBox,
    LinkOverlay,
    FormControl,
    AvatarFileInput,
    Input,
    Button
  } from '@tableslayer/ui';
  import { IconCrown, IconArrowRightDashed } from '@tabler/icons-svelte';
  import { useUpdateUserMutation, useUploadFileMutation } from '$lib/queries';
  import { type FormMutationError, handleMutation } from '$lib/factories';
  let { data } = $props();
  const { invites, userParties, user } = $derived(data);
  let formIsLoading = $state(false);
  let name = $state(user.name);
  let email = $state(user.email);
  let files = $state<FileList | null>(null);
  let avatarFileId: number | undefined = undefined;
  let updateProfileError = $state<FormMutationError | undefined>(undefined);

  const updateUser = useUpdateUserMutation();
  const uploadFile = useUploadFileMutation();

  const handleUpdateUser = async (e: Event) => {
    e.preventDefault();

    if (files && files.length) {
      const uploadedFile = await handleMutation({
        mutation: () => $uploadFile.mutateAsync({ file: files![0], folder: 'avatar' }),
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
        $updateUser.mutateAsync({
          userData: { name, email, avatarFileId }
        }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => (updateProfileError = error),
      onSuccess: (result) => {
        console.log('User updated', result);
      },
      toastMessages: {
        success: { title: 'Profile updated', body: 'Your profile has been updated' },
        error: { title: 'Error updating profile', body: (err) => err.message }
      }
    });
  };
</script>

<div class="container">
  <Title as="h1" size="lg">{user.name}</Title>
  <div class="containerLayout">
    <aside>
      <Title as="h2" size="sm">User details</Title>
      <Spacer size={2} />
      <Panel class="profile__panel">
        <AvatarFileInput src={user.thumb.resizedUrl} size="xl" class="profile__avatar" bind:files />
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
        <Button onclick={handleUpdateUser} disabled={formIsLoading}>Save</Button>
      </Panel>
      {#if invites.length > 0}
        <Spacer />
        <Title as="h2" size="sm">Pending invites</Title>
        <Spacer size={2} />
        <Panel class="profile__panel">
          {#each invites as invite}
            <div class="profile__invite">
              <Avatar src={invite.invitedByUser?.thumb?.resizedUrl} size="sm" />
              <div>
                <Text size="0.875rem" color="var(--fgMuted)">
                  <Text size="0.875rem" as="span" color="var(--fg)"
                    >{invite.invitedByUser?.name || invite.invitedByUser?.email}</Text
                  > invited you to join
                </Text>
                <Title as="p" size="xs">{invite.party?.name}</Title>
                <Spacer />
                <PartyInviteResponse {invite} />
              </div>
            </div>
          {:else}
            <p>No pending invites</p>
          {/each}
        </Panel>
      {/if}
    </aside>
    <div>
      {#each userParties as party (party.id)}
        <LinkBox>
          <div class="profile__partyTitle">
            <Avatar src={party.thumb.resizedUrl} variant="square" size="lg" />
            <LinkOverlay href={`/${party.slug}`}>
              <Title as="h2" size="md" class="profile__partyLink">{party.name}</Title>
            </LinkOverlay>
            <Icon Icon={IconArrowRightDashed} size="1.5rem" color="var(--fgPrimary)" />
            <div class="profile__partyRole">
              {#if party.partyRole === 'admin'}
                <Icon Icon={IconCrown} size="1.5rem" color="var(--fgPrimary)" />
              {/if}
              <Text>{party.partyRole}</Text>
            </div>
          </div>
        </LinkBox>
        <div class="profile__sessionList">
          {#each party.gameSessions as gameSession (gameSession.id)}
            <GameSessionCard isPartyAdmin={party.partyRole === 'admin'} {party} session={gameSession} />
          {/each}
        </div>
        <Spacer size={12} />
      {:else}
        You are not a member of any parties
      {/each}
    </div>
  </div>
</div>

<style>
  .container {
    max-width: var(--contain-desktop);
    margin: var(--size-12) auto;
  }
  .containerLayout {
    display: grid;
    grid-template-columns: 1fr 3fr;
    margin-top: var(--size-8);
    gap: var(--size-12);
  }
  :global {
    .profile__panel {
      padding: 1rem;
      background: var(--bg);
      border-radius: var(--radius-2);
    }
    .profile__partyTitle:hover .profile__partyLink {
      text-decoration: underline;
    }
    .profile__avatar {
      margin: 0 auto 0 auto;
    }
  }
  .profile__invite {
    display: flex;
    gap: 1rem;
    align-items: start;
  }
  .profile__sessionList {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--size-4);
  }
  .profile__partyTitle {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    width: 100%;
  }
  .profile__partyRole {
    display: flex;
    gap: 0.5rem;
    text-transform: capitalize;
    margin-left: auto;
  }
</style>
