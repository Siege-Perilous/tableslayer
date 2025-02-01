<script lang="ts">
  import { type SelectUser, type PartyRole, VALID_PARTY_ROLES } from '$lib/db/app/schema';
  import {
    addToast,
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
  import type { FormMutationError } from '$lib/factories';

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

  let role = $state<PartyRole>(member.role);
  const roleOptions: RoleOption[] = VALID_PARTY_ROLES.map((role) => ({ value: role, label: role }));
  let defaultRole = $derived(roleOptions.find((option) => option.value === role));

  const isSelf = member.id === user.id;

  let formIsLoading = $state(false);
  const deletePartyMember = useDeletePartyMemberMutation();
  const updatePartyMember = useUpdatePartyMemberMutation();

  const handleDeletePartyMember = async (e: Event) => {
    e.preventDefault();
    formIsLoading = true;
    try {
      await $deletePartyMember.mutateAsync({ partyId: member.partyId, userId: member.id });
      formIsLoading = false;
      addToast({
        data: {
          title: 'Member removed',
          body: `${member.name || member.email} has been removed from the party`,
          type: 'success'
        }
      });
    } catch (e) {
      const error = e as FormMutationError;
      formIsLoading = false;
      console.log('member removed error', error);
      addToast({
        data: {
          title: 'Error removing member',
          body: error.message,
          type: 'danger'
        }
      });
    }
  };
  const handleSelectedRole = async (selected: RoleOption) => {
    role = selected.value;
    formIsLoading = true;
    console.log('selected', selected);
    try {
      await $updatePartyMember.mutateAsync({ partyId: member.partyId, userId: member.id, role });
      formIsLoading = false;
      addToast({
        data: {
          title: 'Member role updated',
          body: `${member.name || member.email}'s role has been updated to ${role}`,
          type: 'success'
        }
      });
    } catch (e) {
      const error = e as FormMutationError;
      addToast({
        data: {
          title: 'Error updating member role',
          body: error.message,
          type: 'danger'
        }
      });
      formIsLoading = false;
    }
    console.log('selected', selected);
    return selected;
  };
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
                defaultSelected={defaultRole}
                selectedPrefix="Role: "
                onSelectedChange={(selected) => handleSelectedRole(selected.next as RoleOption)}
              />
            {/snippet}
          </FormControl>
          <Spacer size={2} />
          <Text size="0.875rem" color="var(--fgMuted)"
            >Admins manage billing and can invite others. Editors can edit and create new sessions.</Text
          >
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
        <Text size="0.875rem" color="var(--fgMuted)"
          >A removed party member will need to be reinvited. You can not remove yourself if you are the only admin.</Text
        >
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
