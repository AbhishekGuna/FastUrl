import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type {
  AnalyticsSummary,
  TimeSeriesPoint,
  AnalyticsRange,
} from "../api/client";
import {
  getAnalyticsSummary,
  getAnalyticsTimeSeries,
} from "../api/client";
import { Icon } from "../components/Icon";
import { ThemeToggle } from "../components/ThemeToggle";

const RANGES: { label: string; value: AnalyticsRange }[] = [
  { label: "24 h", value: "24h" },
  { label: "7 d", value: "7d" },
  { label: "30 d", value: "30d" },
];

function formatBucket(bucket: string, range: AnalyticsRange) {
  const d = new Date(bucket);
  if (range === "24h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
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
          <span className="bar-list-label">{item.label || "Unknown"}</span>
          <div className="bar-list-track">
            <div
              className="bar-list-fill"
              style={{ transform: `scaleX(${Math.max(0.02, item.count / max)})` }}
            />
          </div>
          <span className="bar-list-value">{item.count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

function SimplePieChart({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) return <p className="analytics-empty">No data yet.</p>;
  
  // Clean up data for the pie chart
  const data = items.map(item => ({
    name: item.label || "Unknown",
    value: item.count
  }));

  const COLORS = ['var(--accent)', 'var(--accent-strong)', 'var(--ink-soft)', 'var(--line-strong)', 'var(--ink-faint)'];

  return (
    <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--line-strong)",
              borderRadius: "8px",
              color: "var(--ink)",
              fontSize: "13px",
            }}
            itemStyle={{ color: "var(--ink)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [series, setSeries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shortCode) return;
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

  useEffect(() => { load(); }, [load]);

  const chartData = series.map((p) => ({
    label: formatBucket(p.bucket, range),
    clicks: p.clicks,
  }));

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="ghost-button back-button"
            onClick={() => navigate("/")}
            aria-label="Back to dashboard"
          >
            <Icon name="chevron" className="chevron-back" />
            Back
          </button>
          <span className="wordmark">
            FastUrl
          </span>
        </div>
        <div className="analytics-page-title">
          <span className="analytics-page-heading">Analytics</span>
          <span className="analytics-page-code mono">
            <span className="shortcode-domain">
              {(import.meta.env.VITE_SHORT_URL_BASE ?? window.location.origin).replace(/^https?:\/\//, '')}/
            </span>
            <span className="shortcode-path">{shortCode}</span>
          </span>
        </div>
        <div className="topbar-right">
          <ThemeToggle />
        </div>
      </header>

      <main className="content analytics-page-content">
        {error && <p className="form-error banner">{error}</p>}

        {loading && (
          <div className="analytics-loading">
            <div className="analytics-skeleton" />
            <div className="analytics-skeleton short" />
          </div>
        )}

        {!loading && summary && (
          <>
            {/* KPI strip */}
            <div className="kpi-strip">
              <div className="kpi-card">
                <span className="kpi-value">{summary.totalClicks.toLocaleString()}</span>
                <span className="kpi-label">Total Clicks</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">{summary.topCountries[0]?.country ?? "—"}</span>
                <span className="kpi-label">Top Country</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">{summary.topDeviceTypes[0]?.deviceType ?? "—"}</span>
                <span className="kpi-label">Top Device</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">{summary.topBrowsers[0]?.browser ?? "—"}</span>
                <span className="kpi-label">Top Browser</span>
              </div>
            </div>

            {/* Time-series chart */}
            <div className="analytics-section">
              <div className="analytics-section-header">
                <h2 className="analytics-section-title">Clicks over time</h2>
                <div className="range-tabs" role="group" aria-label="Time range">
                  {RANGES.map((r) => (
                    <button
                      key={r.value}
                      className={`range-tab${range === r.value ? " active" : ""}`}
                      onClick={() => setRange(r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {chartData.length === 0 ? (
                <p className="analytics-empty">No clicks in this period.</p>
              ) : (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--ink-faint)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--ink-faint)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface-elevated)",
                          border: "1px solid var(--line-strong)",
                          borderRadius: "8px",
                          color: "var(--ink)",
                          fontSize: "13px",
                          backdropFilter: "blur(12px)",
                        }}
                        cursor={{ fill: "var(--line)" }}
                      />
                      <Bar
                        dataKey="clicks"
                        fill="var(--line-strong)"
                        radius={[4, 4, 0, 0]}
                        activeBar={{ fill: "var(--accent)" }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Breakdown grid */}
            <div className="breakdown-grid">
              <div className="analytics-section">
                <h3 className="analytics-section-title">Referrers</h3>
                <BarList
                  items={summary.topReferrers.map((r) => ({ label: r.referrer, count: r.count }))}
                  label="Top referrers"
                  valueKey="ref"
                />
              </div>
              <div className="analytics-section">
                <h3 className="analytics-section-title">Countries</h3>
                <BarList
                  items={summary.topCountries.map((r) => ({ label: r.country, count: r.count }))}
                  label="Top countries"
                  valueKey="country"
                />
              </div>
              <div className="analytics-section" style={{ alignItems: 'center' }}>
                <h3 className="analytics-section-title" style={{ alignSelf: 'flex-start' }}>Platform</h3>
                <SimplePieChart
                  items={summary.topOs.map((r) => ({ label: r.os, count: r.count }))}
                />
              </div>
              <div className="analytics-section" style={{ alignItems: 'center' }}>
                <h3 className="analytics-section-title" style={{ alignSelf: 'flex-start' }}>Connect Method</h3>
                <SimplePieChart
                  items={summary.topBrowsers.map((r) => ({ label: r.browser, count: r.count }))}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
