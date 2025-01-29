import { invalidateAll } from '$app/navigation';
import { createMutation } from '@tanstack/svelte-query';
import { type ZodIssue } from 'zod';

export type FormMutationError = {
  success: boolean;
  status: number;
  message: string;
  errors?: ZodIssue[];
};

export type FormMutationSuccess = {
  success: boolean;
  status: number;
  message: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutationVariables = Record<string, any>;

// Simple version replaces mutationFn with a simple endpoint call.
type MutationFactoryConfig<VariablesType, SuccessType> =
  | {
      mutationKey: string[];
      mutationFn: (variables: VariablesType) => Promise<SuccessType>;
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    }
  | {
      mutationKey: string[];
      endpoint: string;
      method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    };

export function mutationFactory<
  VariablesType = MutationVariables,
  SuccessType = FormMutationSuccess,
  FailureType = FormMutationError
>(config: MutationFactoryConfig<VariablesType, SuccessType>) {
  return createMutation<SuccessType, FailureType, VariablesType>({
    mutationKey: config.mutationKey,
    mutationFn: async (variables: VariablesType) => {
      if ('mutationFn' in config) {
        return config.mutationFn(variables);
      }

      const response = await fetch(config.endpoint, {
        method: config.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables)
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      return data;
    },
    onError: config.onError ?? ((error) => console.error('Error in mutation:', error)),
    // By default, onSuccess will invalidate all queries to refresh data.
    onSuccess: async () => {
      if (config.onSuccess) {
        config.onSuccess();
      } else {
        await invalidateAll();
      }
    }
  });
}
