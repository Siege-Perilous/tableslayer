<script lang="ts">
  import { type SelectUser, type PartyRole, VALID_PARTY_ROLES } from '$lib/db/app/schema';
  import {
    Hr,
    Text,
    Avatar,
    Select,
    Icon,
    Popover,
    Spacer,
    Button,
    ConfirmActionButton,
    FormControl
  } from '@tableslayer/ui';
  import { IconChevronDown, IconCrown } from '@tabler/icons-svelte';
  import { useDeletePartyMemberMutation, useUpdatePartyMemberMutation } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { goto } from '$app/navigation';

  type PartyMember = SelectUser & {
    role: PartyRole;
    partyId: string;
    thumb: { url: string; resizedUrl: string };
  };

  type PartyMemberProps = {
    member: PartyMember;
    isPartyAdmin: boolean;
    user: SelectUser;
  };
  type RoleOption = { value: PartyRole; label: string };

  let { member, user, isPartyAdmin }: PartyMemberProps = $props();

  let selectedRole = $state<PartyRole>(member.role);
  const roleOptions: RoleOption[] = VALID_PARTY_ROLES.map((role) => ({ value: role, label: role }));

  const isSelf = member.id === user.id;

  let formIsLoading = $state(false);
  const deletePartyMember = useDeletePartyMemberMutation();
  const updatePartyMember = useUpdatePartyMemberMutation();

  const handleDeletePartyMember = async (e: Event) => {
    e.preventDefault();
    await handleMutation({
      mutation: () => $deletePartyMember.mutateAsync({ partyId: member.partyId, userId: member.id }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        if (member.id === user.id) {
          goto('/profile');
        }
      },
      onError: (error) => {
        console.log('member removed error', error);
      },
      toastMessages: {
        success: { title: 'Member removed', body: `${member.name || member.email} has been removed from the party` },
        error: { title: 'Error removing member', body: (err) => err.message }
      }
    });
  };
  const handleSelectedRole = async (selected: PartyRole) => {
    selectedRole = selected;
    console.log('selected', selected);

    await handleMutation({
      mutation: () =>
        $updatePartyMember.mutateAsync({ partyId: member.partyId, userId: member.id, role: selectedRole }),
      formLoadingState: (loading) => (formIsLoading = loading),
      toastMessages: {
        success: {
          title: 'Member role updated',
          body: `${member.name || member.email}'s role has been updated to ${selectedRole}`
        },
        error: { title: 'Error updating member role', body: (err) => err.message }
      }
    });

    console.log('selected', selected);
    return selected;
  };
  $effect(() => {
    selectedRole = member.role;
  });
</script>

{#snippet partyMember()}
  <div class="partyMember {(isPartyAdmin || isSelf) && 'partyMember--canEdit'}">
    <div class="partyMember__avatar">
      <Avatar src={member.thumb.resizedUrl || member.thumb.url} alt={member.name || member.email} />
      {#if isPartyAdmin || isSelf}
        <Icon Icon={IconChevronDown} color="var(--fgMuted)" class="partyMember__chevron" />
      {/if}
    </div>
    <p>{member.name || member.email}</p>
    {#if member.role === 'admin'}
      <Icon Icon={IconCrown} size="1.5rem" color="var(--fgPrimary)" />
    {/if}
  </div>
{/snippet}
{#snippet selectionPrefix()}
  Role:
{/snippet}

{#if isPartyAdmin || isSelf}
  <Popover positioning={{ placement: 'bottom-start' }}>
    {#snippet trigger()}
      {@render partyMember()}
    {/snippet}
    {#snippet content()}
      <div class="partyMember__popover">
        {#if isPartyAdmin}
          <!-- Bind directly to the form field -->
          <FormControl name="role">
            {#snippet input({ inputProps })}
              <Select
                {...inputProps}
                options={roleOptions}
                name="role"
                selected={[selectedRole as string]}
                selectedPrefix={selectionPrefix}
                onSelectedChange={(selected) => handleSelectedRole(selected[0] as PartyRole)}
              />
            {/snippet}
          </FormControl>
          <Spacer size={2} />
          <Text size="0.875rem" color="var(--fgMuted)">
            Admins manage billing and can invite others. Editors can edit and create new sessions.
          </Text>
          <Spacer size={4} />
          <Hr />
          <Spacer size={4} />
        {/if}
        <ConfirmActionButton
          isLoading={formIsLoading}
          actionButtonText="Confirm delete"
          action={handleDeletePartyMember}
        >
          {#snippet trigger({ triggerProps })}
            <Button variant="danger" {...triggerProps}>
              {isSelf ? 'Leave party' : 'Remove party member'}
            </Button>
          {/snippet}
          {#snippet actionMessage()}
            <Text size="0.875rem" color="var(--fgDanger)">
              {isSelf
                ? 'This will remove you from the party and all related sessions.'
                : 'This will permanently remove this member from the party. They can be invited back later.'}
            </Text>
          {/snippet}
        </ConfirmActionButton>
        <Spacer size={2} />
        <Text size="0.875rem" color="var(--fgMuted)">
          A removed party member will need to be reinvited. You can not remove yourself if you are the only admin.
        </Text>
      </div>
    {/snippet}
  </Popover>
{:else}
  {@render partyMember()}
{/if}

<style>
  .partyMember {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }
  .partyMember--canEdit:hover {
    text-decoration: underline;
  }
  .partyMember__avatar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  :global(.partyMember__chevron) {
    justify-self: end;
  }
  .partyMember__popover {
    width: 16rem;
  }
</style>
