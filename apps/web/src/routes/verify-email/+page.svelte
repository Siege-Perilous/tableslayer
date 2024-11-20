<script lang="ts">
  import { superForm } from 'sveltekit-superforms/client';
  import { Field } from 'formsnap';
  import { Button, FSControl, FieldErrors, Input } from '@tableslayer/ui';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { changeUserEmailSchema, resendVerificationCodeSchema, verificationCodeSchema } from '$lib/schemas';
  import SuperDebug from 'sveltekit-superforms';

  let { data } = $props();

  const changeEmailForm = superForm(data.changeEmailForm, {
    validators: zodClient(changeUserEmailSchema)
  });
  const resendForm = superForm(data.resendForm, {
    validators: zodClient(resendVerificationCodeSchema)
  });
  const verifyCodeForm = superForm(data.verifyForm, {
    validators: zodClient(verificationCodeSchema)
  });

  const { form: changeEmailData, enhance: enhanceChangeEmail, message: changeEmailMessage } = changeEmailForm;
  const { form: resendData, enhance: enhanceResend, message: resendMessage } = resendForm;
  const { form: verifyData, enhance: enhanceVerify, message: verifyMessage } = verifyCodeForm;

  let isChangingEmail = $state(false);
</script>

<h1>Verify email</h1>

{#if !isChangingEmail}
  <p>{data.user?.email} <button type="button" onclick={() => (isChangingEmail = true)}>Change</button></p>

  {#if data.isVerified}
    <p>Email is already verified</p>
  {:else if data.isWithinExpiration}
    <form method="post" action="?/verify" use:enhanceVerify>
      <Field form={verifyCodeForm} name="code">
        <FSControl label="Verify code">
          {#snippet children({ attrs })}
            <Input {...attrs} type="text" bind:value={$verifyData.code} />
          {/snippet}
        </FSControl>
        <FieldErrors />
      </Field>
      <Button type="submit">Verify</Button>
      {#if $verifyMessage}
        <p>{$verifyMessage.text}</p>
      {/if}
    </form>
  {:else}
    <p>Your previous verification code expired. Please request a new one.</p>
    <form method="post" action="?/resend" use:enhanceResend>
      <button>Resend</button>
      {#if $resendMessage}
        <p>{$resendMessage.text}</p>
      {/if}
    </form>
  {/if}
{:else}
  <form method="post" action="?/changeEmail" use:enhanceChangeEmail>
    <Field form={changeEmailForm} name="email">
      <FSControl label="New email">
        {#snippet children({ attrs })}
          <Input {...attrs} type="email" bind:value={$changeEmailData.email} />
        {/snippet}
      </FSControl>
      <FieldErrors />
    </Field>
    <button>Change email</button>
    <button type="button" onclick={() => (isChangingEmail = false)}>Cancel</button>
    {#if $changeEmailMessage}
      <p>{$changeEmailMessage.text}</p>
    {/if}
  </form>
{/if}

<SuperDebug data={$changeEmailData} label="Change email" />
<SuperDebug data={$resendData} label="Resend email" />
<SuperDebug data={$verifyData} label="Verify code" />
