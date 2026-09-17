import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, signUp } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { passwordIssue } from '../lib/validate';

export function SignUp() {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        const issue = passwordIssue(password);
        if (issue) {
            setError(issue);
            return;
        }

        setPending(true);
        try {
            await signUp(email, password, name);
            await signIn(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Couldn't create your account. Try again.",
            );
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="auth-screen">
            <div className="auth-sheet">
                <h1 className="wordmark">FastUrl</h1>
                <p className="auth-sub">Create an account to start shortening links.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label>
                        Name
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            required
                        />
                    </label>
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
                            autoComplete="new-password"
                            required
                        />
                        <span className="field-hint">
                            At least 8 characters, with an uppercase letter, a lowercase letter, a
                            number, and a special character.
                        </span>
                    </label>

                    {error && <p className="form-error">{error}</p>}

                    <button type="submit" className="primary-button auth-submit" disabled={pending}>
                        {pending ? 'Creating account…' : 'Create account'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/sign-in">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
