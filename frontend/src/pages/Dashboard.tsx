import { useCallback, useEffect, useState } from 'react';
import { ApiError, listUrls } from '../api/client';
import type { CreateUrlResponse, ShortUrl } from '../api/types';
import { CreateLinkForm } from '../components/CreateLinkForm';
import { Icon } from '../components/Icon';
import { LinkRow } from '../components/LinkRow';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 20;

export function Dashboard() {
    const { user, signOut } = useAuth();
    const [urls, setUrls] = useState<ShortUrl[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);

    const load = useCallback(async (offset: number, replace: boolean) => {
        try {
            const page = await listUrls(PAGE_SIZE, offset);
            setUrls((prev) => (replace ? page : [...prev, ...page]));
            setHasMore(page.length === PAGE_SIZE);
            setError(null);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't load your links.");
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        load(0, true).finally(() => setLoading(false));
    }, [load]);

    function handleCreated(created: CreateUrlResponse) {
        setUrls((prev) => [
            {
                id: created.shortCode,
                shortCode: created.shortCode,
                userId: user?.id ?? '',
                destination: created.destination,
                status: 'ACTIVE',
                redirectType: 302,
                createdAt: new Date().toISOString(),
                expiresAt: created.expiresAt ?? null,
                clickCount: 0,
            },
            ...prev,
        ]);
    }

    function handleUpdated(next: ShortUrl) {
        setUrls((prev) => prev.map((u) => (u.shortCode === next.shortCode ? next : u)));
    }

    async function loadMore() {
        setLoadingMore(true);
        await load(urls.length, false);
        setLoadingMore(false);
    }

    return (
        <div className="page">
            <header className="topbar">
                <span className="wordmark">FastUrl</span>
                <div className="topbar-right">
                    <ThemeToggle />
                    <span className="topbar-email">{user?.email}</span>
                    <button type="button" className="ghost-button" onClick={() => void signOut()}>
                        Sign out
                    </button>
                </div>
            </header>

            <main className="content">
                <CreateLinkForm onCreated={handleCreated} />

                {error && <p className="form-error banner">{error}</p>}

                {loading ? (
                    <div className="ledger-skeleton" role="status" aria-label="Loading your links">
                        {[1, 2, 3, 4, 5].map((id) => (
                            <div className="ledger-skeleton-row" key={id} />
                        ))}
                    </div>
                ) : urls.length === 0 ? (
                    <div className="empty-state">
                        <p>No links yet.</p>
                        <p className="empty-state-sub">
                            Add a destination above to create your first short link.
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="ledger">
                            <thead>
                                <tr>
                                    <th className="col-code">Short code</th>
                                    <th className="col-destination">Destination</th>
                                    <th>Status</th>
                                    <th className="col-created">Created</th>
                                    <th className="col-actions">
                                        <span className="visually-hidden">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {urls.map((url) => (
                                    <LinkRow
                                        key={url.shortCode}
                                        url={url}
                                        onUpdated={handleUpdated}
                                    />
                                ))}
                            </tbody>
                        </table>

                        {hasMore && (
                            <button
                                type="button"
                                className="ghost-button load-more"
                                onClick={loadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? <Icon name="spinner" className="spin" /> : null}
                                {loadingMore ? 'Loading…' : 'Load more'}
                            </button>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
