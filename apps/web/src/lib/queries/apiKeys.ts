import { mutationFactory } from '$lib/factories';
import { createQuery } from '@tanstack/svelte-query';

export type ApiKey = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type GenerateApiKeyResponse = {
  success: boolean;
  key: string;
  keyId: string;
  name: string;
};

export const useGenerateApiKeyMutation = () => {
  return mutationFactory<{ name: string }, GenerateApiKeyResponse>({
    mutationKey: ['generateApiKey'],
    endpoint: '/api/auth/apiKey/generate',
    method: 'POST'
  });
};

export const useDeleteApiKeyMutation = () => {
  return mutationFactory<{ keyId: string }, { success: boolean }>({
    mutationKey: ['deleteApiKey'],
    endpoint: '/api/auth/apiKey/delete',
    method: 'POST'
  });
};

export const createApiKeysQuery = () => {
  return createQuery<{ success: boolean; keys: ApiKey[] }, Error>(() => ({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const response = await fetch('/api/auth/apiKey/list');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      return response.json();
    }
  }));
};
