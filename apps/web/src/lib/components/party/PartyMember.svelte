<script lang="ts">
  import { type SelectUser, type PartyRole, VALID_PARTY_ROLES } from '$lib/db/app/schema';
  import { FSControl, Select } from '@tableslayer/ui';
  import { Field } from 'formsnap';
  import { type SuperForm } from 'sveltekit-superforms/client';
  import { type ChangeRoleFormType, changeRoleSchema } from '$lib/schemas';
  import { superForm } from 'sveltekit-superforms/client';
  import { zodClient } from 'sveltekit-superforms/adapters';

  type PartyMember = SelectUser & {
    role: PartyRole;
    partyId: string;
  };

  type PartyMemberProps = {
    member: PartyMember;
    changeMemberRoleForm: SuperForm<ChangeRoleFormType>;
  };

  let { member, changeMemberRoleForm }: PartyMemberProps = $props();

  const form = superForm(changeMemberRoleForm, {
    id: member.id,
    validators: zodClient(changeRoleSchema),
    resetForm: true
  });

  const { form: memberForm, enhance, message } = form;

  console.log('memberForm', $memberForm);

  $memberForm.userId = member.id;
  $memberForm.role = member.role;
  $memberForm.partyId = member.partyId;
  console.log('memberForm', $memberForm);

  const roleOptions = VALID_PARTY_ROLES.map((role) => ({ value: role, label: role }));
  const defaultRole = roleOptions.find((role) => role.value === $memberForm.role);
</script>

<p>{member.email} - {member.role} - {member.partyId}</p>

<form method="POST" action="?/changeRole" use:enhance>
  <!-- Bind directly to the form field -->
  <Field {form} name="role">
    <FSControl>
      {#snippet children({ attrs })}
        <Select {...attrs} options={roleOptions} name="role" defaultSelected={defaultRole} />
      {/snippet}
    </FSControl>
    <input type="hidden" name="userId" value={$memberForm.userId} />
    <input type="hidden" name="partyId" value={$memberForm.partyId} />
  </Field>
  <button type="submit">Submit</button>
</form>

{#if $message}
  <p>{$message.text}</p>
{/if}
