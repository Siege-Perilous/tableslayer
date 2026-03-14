<script lang="ts">
  import {
    Button,
    IconButton,
    FormControl,
    Input,
    Panel,
    Spacer,
    Text,
    Title,
    ConfirmActionButton,
    Icon,
    addToast
  } from '@tableslayer/ui';
  import { IconCopy, IconX, IconCheck } from '@tabler/icons-svelte';
  import { useGenerateApiKeyMutation, useDeleteApiKeyMutation } from '$lib/queries';
  import { handleMutation, type FormMutationError } from '$lib/factories';
  import { invalidateAll } from '$app/navigation';

  type ApiKey = {
    id: string;
    name: string;
    createdAt: Date;
    lastUsedAt: Date | null;
  };

  let { apiKeys }: { apiKeys: ApiKey[] } = $props();

  let newKeyName = $state('');
  let formIsLoading = $state(false);
  let formError = $state<FormMutationError | undefined>(undefined);
  let generatedKey = $state<string | null>(null);
  let copied = $state(false);

  const generateApiKey = useGenerateApiKeyMutation();
  const deleteApiKey = useDeleteApiKeyMutation();

  const handleGenerateKey = async (e: Event) => {
    e.preventDefault();
    generatedKey = null;

    await handleMutation({
      mutation: () => generateApiKey.mutateAsync({ name: newKeyName }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onError: (error) => (formError = error),
      onSuccess: (result) => {
        formError = undefined;
        newKeyName = '';
        generatedKey = result.key;
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'API key generated', body: "Copy it now - you won't see it again!" },
        error: { title: 'Error generating key', body: (err) => err.message }
      }
    });
  };

  const handleDeleteKey = async (keyId: string) => {
    await handleMutation({
      mutation: () => deleteApiKey.mutateAsync({ keyId }),
      formLoadingState: (loading) => (formIsLoading = loading),
      onSuccess: () => {
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'API key deleted' },
        error: { title: 'Error deleting key', body: (err) => err.message }
      }
    });
  };

  const copyToClipboard = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      copied = true;
      addToast({ title: 'API key copied', type: 'success' });
      setTimeout(() => (copied = false), 2000);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const dismissKeyModal = () => {
    generatedKey = null;
  };
</script>

<div class="apiKeyManager" data-testid="apiKeyManager">
  <Title as="h2" size="sm">API keys</Title>
  <Text size="0.875rem" color="var(--fgMuted)">Keys can be used to authenticate with our API for custom scripting</Text>
  <Spacer size="0.5rem" />
  <Panel class="profile__panel">
    {#if generatedKey}
      <Text color="var(--fgDanger)" weight={600}>Your new API key (copy it now!):</Text>
      <Spacer size="0.5rem" />
      <div class="apiKeyManager__keyDisplay">
        <code class="apiKeyManager__key" data-testid="apiKeyValue">{generatedKey}</code>
        <Button variant="ghost" onclick={copyToClipboard} data-testid="apiKeyCopyButton">
          {#snippet start()}
            <Icon Icon={copied ? IconCheck : IconCopy} size="1rem" />
          {/snippet}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <Spacer />
      <Button onclick={dismissKeyModal} data-testid="apiKeyDoneButton">Done</Button>
    {:else}
      <form onsubmit={handleGenerateKey} data-testid="apiKeyForm">
        <div class="apiKeyManager__form">
          <FormControl label="Name" name="name" errors={formError?.errors}>
            {#snippet input({ inputProps })}
              <Input
                {...inputProps}
                bind:value={newKeyName}
                placeholder="Game room machine"
                data-testid="apiKeyNameInput"
              />
            {/snippet}
          </FormControl>
          <Button
            onclick={handleGenerateKey}
            disabled={formIsLoading || !newKeyName}
            data-testid="apiKeyGenerateButton"
          >
            Generate
          </Button>
        </div>
      </form>
    {/if}

    <Spacer />
    {#if apiKeys.length > 0}
      <div class="apiKeyManager__list" data-testid="apiKeyList">
        {#each apiKeys as key (key.id)}
          <div class="apiKeyManager__item" data-testid="apiKeyItem">
            <div class="apiKeyManager__itemInfo">
              <Text size="0.875rem" data-testid="apiKeyItemName">{key.name}</Text>
              <Text size="0.75rem" color="var(--fgMuted)">
                Created: {formatDate(key.createdAt)} · Last used: {formatDate(key.lastUsedAt)}
              </Text>
            </div>
            <ConfirmActionButton action={() => handleDeleteKey(key.id)} actionButtonText="Delete">
              {#snippet trigger({ triggerProps })}
                <IconButton variant="danger" size="sm" {...triggerProps} data-testid="apiKeyDeleteButton">
                  <Icon Icon={IconX} size="1rem" />
                </IconButton>
              {/snippet}
              {#snippet actionMessage()}
                <Text size="0.875rem">This is permanent.</Text>
              {/snippet}
            </ConfirmActionButton>
          </div>
        {/each}
      </div>
    {:else}
      <Text size="0.875rem" color="var(--fgMuted)">No API keys exist.</Text>
    {/if}
  </Panel>
</div>

<style>
  .apiKeyManager__form {
    display: flex;
    gap: var(--size-2);
    align-items: flex-end;
  }

  .apiKeyManager__keyDisplay {
    display: flex;
    gap: var(--size-2);
    align-items: center;
  }

  .apiKeyManager__key {
    font-family: monospace;
    font-size: 0.75rem;
    padding: var(--size-2);
    background: var(--bg);
    border-radius: var(--radius-1);
    word-break: break-all;
    flex: 1;
  }

  .apiKeyManager__list {
    border-top: 1px solid var(--contrastLow);
    padding-top: var(--size-3);
  }

  .apiKeyManager__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--size-2) 0;
    border-bottom: 1px solid var(--contrastLow);
  }

  .apiKeyManager__item:last-child {
    border-bottom: none;
  }

  .apiKeyManager__itemInfo {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
  }
</style>
