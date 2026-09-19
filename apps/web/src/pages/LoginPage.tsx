import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { ApiError, apiFetch } from '@/api/client';
import type { LoginResponse } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  // Uncontrolled: nothing here needs to react to a keystroke (no live
  // validation), so plain useState fields would just re-render the whole
  // form on every character typed. Read the values once, at submit.
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already logged in (or a refresh just resolved to authenticated) — no
  // reason to show the form again.
  if (status === 'authenticated') {
    return <Navigate to="/employees" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // This 401 (wrong password) is an expected, inline-handled outcome —
      // not a "your session expired" signal, so skip the redirect interceptor.
      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: {
          email: emailRef.current?.value ?? '',
          password: passwordRef.current?.value ?? '',
        },
        skipAuthRedirect: true,
      });
      login(result.token, result.user);
      navigate('/employees', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm"
      >
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Compensation Manager</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            ref={emailRef}
            defaultValue=""
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            ref={passwordRef}
            defaultValue=""
          />
        </div>

        {error !== null && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
