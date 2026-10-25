import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { LoginForm } from './components/LoginForm';
import { useLogin } from './hooks/useLogin';
import { redirectTarget } from './redirectTarget';

export function LoginPage() {
  const { status } = useAuth();
  const location = useLocation();
  const { login, isPending, errorMessage } = useLogin();

  // Covers both "already signed in" and "just signed in": a successful login
  // flips status to authenticated and this render sends the user back to
  // the deep link RequireAuth bounced them from.
  if (status === 'authenticated') {
    return <Navigate to={redirectTarget(location.state)} replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <LoginForm onSubmit={login} isPending={isPending} errorMessage={errorMessage} />
    </div>
  );
}
