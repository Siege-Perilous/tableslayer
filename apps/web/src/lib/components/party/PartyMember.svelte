<script lang="ts">
  import { type SelectUser, type PartyRole, VALID_PARTY_ROLES } from '$lib/db/app/schema';
  import { FSControl, Text, Avatar, Select, MessageError, Icon, Popover, Spacer, Button } from '@tableslayer/ui';
  import { Field } from 'formsnap';
  import { type SuperValidated } from 'sveltekit-superforms/client';
  import { type ChangeRoleFormType, changeRoleSchema } from '$lib/schemas';
  import { superForm } from 'sveltekit-superforms/client';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { IconChevronDown, IconCrown } from '@tabler/icons-svelte';

  type PartyMember = SelectUser & {
    role: PartyRole;
    partyId: string;
    avatarThumb: { url: string; resizedUrl: string };
  };

  type PartyMemberProps = {
    member: PartyMember;
    changeMemberRoleForm: SuperValidated<ChangeRoleFormType>;
    isPartyAdmin: boolean;
  };

  let { member, changeMemberRoleForm, isPartyAdmin }: PartyMemberProps = $props();

  const form = superForm(changeMemberRoleForm, {
    id: member.id,
    validators: zodClient(changeRoleSchema),
    resetForm: true
  });

  const { form: memberForm, enhance, message } = form;

  $memberForm.userId = member.id;
  $memberForm.role = member.role;
  $memberForm.partyId = member.partyId;

  type RoleOption = { value: PartyRole; label: string };

  const roleOptions: RoleOption[] = VALID_PARTY_ROLES.map((role) => ({ value: role, label: role }));
  let defaultRole = $state(roleOptions.find((role) => role.value === $memberForm.role));

  const handleSelectedRole = (selected: RoleOption) => {
    $memberForm.role = selected.value;
    defaultRole = selected;
    // delay for the form to update
    setTimeout(() => form.submit(), 200);
    return selected;
  };
</script>

{#snippet partyMember()}
  <div class="partyMember">
    <div class="partyMember__avatar">
      <Avatar src={member.avatarThumb.resizedUrl || member.avatarThumb.url} alt={member.name || member.email} />
      {#if isPartyAdmin}
        <Icon Icon={IconChevronDown} color="var(--fgMuted)" class="partyMember__chevron" />
      {/if}
    </div>
    <p>{member.name || member.email}</p>
    {#if member.role === 'admin'}
      <Icon Icon={IconCrown} size="1.5rem" color="var(--fgPrimary)" />
    {/if}
  </div>
{/snippet}

{#if isPartyAdmin}
  <Popover positioning={{ placement: 'bottom-start' }}>
    {#snippet trigger()}
      {@render partyMember()}
    {/snippet}
    {#snippet content()}
      <div class="partyMember__popover">
        <Spacer size={2} />
        <form method="POST" action="?/changeRole" use:enhance>
          <!-- Bind directly to the form field -->
          <Field {form} name="role">
            <FSControl>
              {#snippet children({ attrs })}
                <Select
                  {...attrs}
                  options={roleOptions}
                  name="role"
                  defaultSelected={defaultRole}
                  selectedPrefix="Role: "
                  onSelectedChange={(selected) => handleSelectedRole(selected.next as RoleOption)}
                />
              {/snippet}
            </FSControl>
            <input type="hidden" name="role" value={$memberForm.role} />
            <input type="hidden" name="userId" value={$memberForm.userId} />
            <input type="hidden" name="partyId" value={$memberForm.partyId} />
          </Field>
        </form>
        <Spacer size={2} />
        <Text size="0.875rem" color="var(--fgMuted)"
          >Admins manage billing and can invite others. Editors can edit and create new sessions.</Text
        >
        <Spacer size={4} />
        <Button variant="danger">Remove {member.name || member.email}</Button>
        <Spacer size={2} />
        <Text size="0.875rem" color="var(--fgMuted)"
          >A removed member will need to be reinvited. You can not remove yourself if you are the only admin.</Text
        >
      </div>
    {/snippet}
  </Popover>
{:else}
  {@render partyMember()}
{/if}

{#if $message}
  <MessageError message={$message} />
{/if}

<style>
  .partyMember {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }
  .partyMember:hover {
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
