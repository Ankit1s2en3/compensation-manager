import { useMutation } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

import { loginRequest } from '../api';
import { useAuth } from '../AuthProvider';

function errorMessage(error: Error | null): string | null {
  if (error === null) return null;
  if (error instanceof ApiError && error.status === 401) return 'Invalid email or password.';
  return 'Something went wrong. Please try again.';
}

/**
 * Posts credentials and, on success, stores the session. Navigation is not
 * done here: flipping AuthProvider to `authenticated` makes LoginPage render
 * its redirect, the same path a user who's already signed in takes.
 */
export function useLogin() {
  const { login } = useAuth();

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => login(result.token, result.user),
  });

  return {
    login: mutation.mutate,
    isPending: mutation.isPending,
    // v5 resets `error` when a new mutate starts, so a resubmit clears the
    // previous message just as the old setError(null) did.
    errorMessage: errorMessage(mutation.error),
  };
}
