import { invalidateAll } from '$app/navigation';
import { addToast } from '@tableslayer/ui';
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
  return createMutation<SuccessType, FailureType, VariablesType>(() => ({
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

      const data = (await response.json()) as SuccessType;

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
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MutationConfig<T = any> {
  mutation: () => Promise<T>;
  formLoadingState: (loading: boolean) => void;
  onError?: (error: FormMutationError | undefined) => void;
  onSuccess?: (result: T) => void;
  toastMessages: {
    success?: { title: string; body?: string };
    error?: { title: string; body?: string | ((error: FormMutationError) => string) };
  };
}

export async function handleMutation<T>({
  mutation,
  formLoadingState,
  onError,
  onSuccess,
  toastMessages
}: MutationConfig<T>): Promise<T | undefined> {
  formLoadingState(true);
  try {
    const result = await mutation(); // Capture the mutation's return value
    formLoadingState(false);
    if (toastMessages.success) {
      addToast({
        data: {
          title: toastMessages.success.title,
          body: toastMessages.success.body ?? '',
          type: 'success'
        }
      });
    }
    onSuccess?.(result); // Pass the result to the onSuccess callback
    return result; // Return the mutation's result
  } catch (e) {
    const error = e as FormMutationError;
    if (onError) {
      onError(error);
    }
    formLoadingState(false);
    if (toastMessages.error) {
      addToast({
        data: {
          title: toastMessages.error.title,
          body:
            typeof toastMessages.error.body === 'function'
              ? toastMessages.error.body(error)
              : (toastMessages.error.body ?? ''),
          type: 'danger'
        }
      });
    }
    return undefined; // Return undefined on error
  }
}
