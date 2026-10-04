import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, signUp } from '../api/client';
import { passwordIssue } from '../lib/validate';

export function SignUp() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        const issue = passwordIssue(password, { email, name });
        if (issue) {
            setError(issue);
            return;
        }

        setPending(true);
        try {
            await signUp(email, password, name);
            // Backend sends a verification email before issuing a session.
            // Show the "check your inbox" screen instead of navigating away.
            setVerificationSent(true);
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Couldn't create your account. Try again.",
            );
        } finally {
            setPending(false);
        }
    }

    if (verificationSent) {
        return (
            <div className="auth-screen">
                <div className="auth-sheet">
                    <h1 className="wordmark">FastUrl</h1>
                    <p className="auth-sub" style={{ marginBottom: '1rem' }}>
                        Account created! Check your inbox.
                    </p>
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        We sent a verification link to <strong>{email}</strong>. Click the link in
                        that email to activate your account and sign in.
                    </p>
                    <p className="auth-switch" style={{ marginTop: '1.5rem' }}>
                        Already verified? <Link to="/sign-in">Sign in</Link>
                    </p>
                </div>
            </div>
        );
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
                            8–64 characters with uppercase, lowercase, a number, and a special
                            character. Common or breached passwords are rejected.
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
