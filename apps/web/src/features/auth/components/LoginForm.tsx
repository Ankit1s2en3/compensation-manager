import type { FormEvent } from 'react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { LoginCredentials } from '../api';

export function LoginForm({
  onSubmit,
  isPending,
  errorMessage,
}: {
  onSubmit: (credentials: LoginCredentials) => void;
  isPending: boolean;
  errorMessage: string | null;
}) {
  // Uncontrolled: nothing here needs to react to a keystroke (no live
  // validation), so plain useState fields would just re-render the whole
  // form on every character typed. Read the values once, at submit.
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      email: emailRef.current?.value ?? '',
      password: passwordRef.current?.value ?? '',
    });
  }

  return (
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

      {errorMessage !== null && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
