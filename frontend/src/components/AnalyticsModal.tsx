import { useCallback, useEffect, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { AnalyticsRange, AnalyticsSummary, TimeSeriesPoint } from '../api/client';
import { getAnalyticsSummary, getAnalyticsTimeSeries } from '../api/client';

interface Props {
    shortCode: string;
    onClose: () => void;
}

const RANGES: { label: string; value: AnalyticsRange }[] = [
    { label: '24 h', value: '24h' },
    { label: '7 d', value: '7d' },
    { label: '30 d', value: '30d' },
];

function formatBucket(bucket: string, range: AnalyticsRange) {
    const d = new Date(bucket);
    if (range === '24h') {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function BarList({
    items,
    label,
    valueKey,
}: {
    items: { label: string; count: number }[];
    label: string;
    valueKey: string;
}) {
    if (items.length === 0) return <p className="analytics-empty">No data yet.</p>;
    const max = items[0].count;
    return (
        <ul className="bar-list" aria-label={label}>
            {items.map((item) => (
                <li key={`${valueKey}-${item.label}`} className="bar-list-item">
                    <span className="bar-list-label">{item.label}</span>
                    <div className="bar-list-track">
                        <div
                            className="bar-list-fill"
                            style={{ width: `${Math.max(2, (item.count / max) * 100)}%` }}
                        />
                    </div>
                    <span className="bar-list-value">{item.count.toLocaleString()}</span>
                </li>
            ))}
        </ul>
    );
}

export function AnalyticsModal({ shortCode, onClose }: Props) {
    const [range, setRange] = useState<AnalyticsRange>('7d');
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [series, setSeries] = useState<TimeSeriesPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s, ts] = await Promise.all([
                getAnalyticsSummary(shortCode),
                getAnalyticsTimeSeries(shortCode, range),
            ]);
            setSummary(s);
            setSeries(ts);
        } catch {
            setError("Couldn't load analytics. Try again later.");
        } finally {
            setLoading(false);
        }
    }, [shortCode, range]);

    useEffect(() => {
        load();
    }, [load]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const chartData = series.map((p) => ({
        label: formatBucket(p.bucket, range),
        clicks: p.clicks,
    }));

    return (
        <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={`Analytics for /${shortCode}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            onKeyDown={(e) => {
                if (
                    e.target === e.currentTarget &&
                    (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
                ) {
                    onClose();
                }
            }}
        >
            <div className="analytics-modal">
                {/* Header */}
                <div className="analytics-header">
                    <div>
                        <h2 className="analytics-title">Analytics</h2>
                        <p className="analytics-subtitle mono">/{shortCode}</p>
                    </div>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close analytics"
                    >
                        ✕
                    </button>
                </div>

                {loading && (
                    <div className="analytics-loading">
                        <div className="analytics-skeleton" />
                        <div className="analytics-skeleton short" />
                    </div>
                )}

                {error && <p className="form-error banner">{error}</p>}

                {!loading && summary && (
                    <>
                        {/* KPI strip */}
                        <div className="kpi-strip">
                            <div className="kpi-card">
                                <span className="kpi-value">
                                    {summary.totalClicks.toLocaleString()}
                                </span>
                                <span className="kpi-label">Total Clicks</span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-value">
                                    {summary.topCountries[0]?.country ?? '—'}
                                </span>
                                <span className="kpi-label">Top Country</span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-value">
                                    {summary.topDeviceTypes[0]?.deviceType ?? '—'}
                                </span>
                                <span className="kpi-label">Top Device</span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-value">
                                    {summary.topBrowsers[0]?.browser ?? '—'}
                                </span>
                                <span className="kpi-label">Top Browser</span>
                            </div>
                        </div>

                        {/* Time-series chart */}
                        <div className="analytics-section">
                            <div className="analytics-section-header">
                                <h3 className="analytics-section-title">Clicks over time</h3>
                                <fieldset className="range-tabs" aria-label="Time range">
                                    {RANGES.map((r) => (
                                        <button
                                            type="button"
                                            key={r.value}
                                            className={`range-tab${range === r.value ? ' active' : ''}`}
                                            onClick={() => setRange(r.value)}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </fieldset>
                            </div>
                            {chartData.length === 0 ? (
                                <p className="analytics-empty">No clicks in this period.</p>
                            ) : (
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart
                                            data={chartData}
                                            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="rgba(255,255,255,0.06)"
                                            />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'var(--surface-elevated)',
                                                    border: '1px solid var(--line-strong)',
                                                    borderRadius: '8px',
                                                    color: 'var(--ink)',
                                                    fontSize: '13px',
                                                }}
                                                cursor={{ stroke: 'var(--accent)', strokeWidth: 1 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="clicks"
                                                stroke="var(--accent)"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{
                                                    r: 4,
                                                    fill: 'var(--accent)',
                                                    stroke: 'var(--surface)',
                                                }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Breakdown grid */}
                        <div className="breakdown-grid">
                            <div className="analytics-section">
                                <h3 className="analytics-section-title">Referrers</h3>
                                <BarList
                                    items={summary.topReferrers.map((r) => ({
                                        label: r.referrer,
                                        count: r.count,
                                    }))}
                                    label="Top referrers"
                                    valueKey="ref"
                                />
                            </div>
                            <div className="analytics-section">
                                <h3 className="analytics-section-title">Countries</h3>
                                <BarList
                                    items={summary.topCountries.map((r) => ({
                                        label: r.country,
                                        count: r.count,
                                    }))}
                                    label="Top countries"
                                    valueKey="country"
                                />
                            </div>
                            <div className="analytics-section">
                                <h3 className="analytics-section-title">Operating Systems</h3>
                                <BarList
                                    items={summary.topOs.map((r) => ({
                                        label: r.os,
                                        count: r.count,
                                    }))}
                                    label="Top operating systems"
                                    valueKey="os"
                                />
                            </div>
                            <div className="analytics-section">
                                <h3 className="analytics-section-title">Browsers</h3>
                                <BarList
                                    items={summary.topBrowsers.map((r) => ({
                                        label: r.browser,
                                        count: r.count,
                                    }))}
                                    label="Top browsers"
                                    valueKey="browser"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
