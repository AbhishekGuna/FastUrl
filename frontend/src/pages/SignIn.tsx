import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function SignIn() {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [unverified, setUnverified] = useState(false);
    const [pending, setPending] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setPending(true);
        setError(null);
        setUnverified(false);
        try {
            await signIn(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.status === 403) {
                // Better Auth returns 403 when email is not verified yet
                setUnverified(true);
            } else {
                setError(err instanceof ApiError ? err.message : "Couldn't sign in. Try again.");
            }
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="auth-screen">
            <div className="auth-sheet">
                <h1 className="wordmark">FastUrl</h1>
                <p className="auth-sub">Sign in to manage your links.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label>
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </label>
                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    {unverified && (
                        <p className="form-error">
                            Please verify your email before signing in. Check your inbox for a
                            verification link.
                        </p>
                    )}
                    {error && <p className="form-error">{error}</p>}

                    <button type="submit" className="primary-button auth-submit" disabled={pending}>
                        {pending ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>

                <p className="auth-switch">
                    No account? <Link to="/sign-up">Sign up</Link>
                </p>
            </div>
        </div>
    );
}
