<script lang="ts">
  import { CldImage } from 'svelte-cloudinary';
  import { type SelectUser, VALID_PARTY_ROLES } from '$lib/db/schema';
  import { type PartyRole } from '$lib/db/schema';
  import SuperDebug, { superForm } from 'sveltekit-superforms';
  import { Control, Field } from 'formsnap';
  import { changeRoleSchema } from '$lib/schemas';
  import { zodClient } from 'sveltekit-superforms/adapters';

  type PartyMemberProps = SelectUser & {
    role: PartyRole;
    partyId: string;
  };

  let { member }: { member: PartyMemberProps; partyId: string } = $props();

  const { id: userId, role, partyId } = member;

  const changeRoleForm = superForm(
    { userId, partyId, role },
    {
      validators: zodClient(changeRoleSchema),
      resetForm: true
    }
  );
  const { form, enhance, message, formId, delayed } = changeRoleForm;
</script>

<CldImage src={member.avatar} width={40} height={40} />
<p>{member.email} - {member.role} - {partyId}</p>

<form method="POST" action="?/changeRole" use:enhance>
  <Field {form} name="email">
    <Control let:attrs>
      <select {...attrs} name="role" bind:value={$form.role} onchange={() => ($formId = member.id)}>
        {#each VALID_PARTY_ROLES as role}
          <option value={role}>{role}</option>
        {/each}
      </select>
      <input type="hidden" name="userId" bind:value={$form.userId} />
      <input type="hidden" name="partyId" bind:value={$form.partyId} />
    </Control>
  </Field>
  <button>Sumbit</button>
</form>

{#if $message}
  <p>{$message.text}</p>
{/if}
<SuperDebug label="Change role form" data={form} />
