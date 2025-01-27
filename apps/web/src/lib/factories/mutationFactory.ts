import { invalidateAll } from '$app/navigation';
import { createMutation } from '@tanstack/svelte-query';

export type FormMutationError = {
  success: boolean;
  status: number;
  message: string;
  errors?: { code: string; expected: string; received: string; path: string[] }[];
};

export type FormMutationSuccess = {
  success: boolean;
  status: number;
  message: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutationVariables = Record<string, any>;

type MutationFactoryConfig = {
  mutationKey: string[];
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  onSuccess?: () => void;
};

export function mutationFactory<
  SuccessType = FormMutationSuccess,
  FailureType = FormMutationError,
  VariablesType = MutationVariables
>(config: MutationFactoryConfig) {
  return createMutation<SuccessType, FailureType, VariablesType>({
    mutationKey: config.mutationKey,
    mutationFn: async (variables: VariablesType) => {
      const response = await fetch(config.endpoint, {
        method: config.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables)
      });

      const data = await response.json();

      if (!response.ok) {
        throw data; // Throw the response with errors
      }

      return data; // Return success response
    },
    onError: (error) => {
      console.error('Error in mutation:', error); // Log or handle the error
    },
    onSuccess: async () => {
      if (config.onSuccess) {
        config.onSuccess();
      } else {
        await invalidateAll();
      }
    }
  });
}
