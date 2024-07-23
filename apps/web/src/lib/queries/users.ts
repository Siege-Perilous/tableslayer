import type { SelectUser } from '$lib/db';
import { createQuery } from '@tanstack/svelte-query';

export const createUsersQuery = () => {
  return createQuery<SelectUser[], Error>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }
  });
};
