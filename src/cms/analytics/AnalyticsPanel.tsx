import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ViewAnalyticsSummary } from "../../lib/cms/viewAnalytics";

type AnalyticsPanelProps = {
  summary: ViewAnalyticsSummary | null;
  status: string;
  rangeDays: number;
  onRangeChange: (days: number) => void;
  onRefresh: () => void;
};

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const longDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const formatNumber = (value: number) => numberFormatter.format(value || 0);

const formatDate = (value: string, includeYear = false) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return (includeYear ? longDateFormatter : shortDateFormatter).format(date);
};

const formatLastSeen = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const elapsed = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
};

const displayReferrer = (value: string) => {
  if (!value || value === "direct") return "Direct / none";
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
};

const displayTarget = (value: string) => {
  if (!value || value === "unknown") return "Unknown target";
  let decoded = value;
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  const trackedAction = decoded.match(/^(tour-zalo|tour-whatsapp):(.*)$/i);
  if (trackedAction) {
    return `${trackedAction[1].toLowerCase() === "tour-zalo" ? "Zalo" : "WhatsApp"} · ${trackedAction[2]}`;
  }
  if (/^tel:/i.test(decoded)) return `Call ${decoded.slice(4)}`;
  if (/^mailto:/i.test(decoded)) return `Email ${decoded.slice(7)}`;
  if (!/^https?:\/\//i.test(decoded)) return decoded;
  try {
    const url = new URL(decoded);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return decoded;
  }
};

const referrerRows = (summary: ViewAnalyticsSummary | null) => {
  const grouped = new Map<string, { label: string; rawLabel: string; meta: string; value: number }>();
  for (const item of summary?.topReferrers ?? []) {
    const label = displayReferrer(item.referrer);
    const current = grouped.get(label);
    grouped.set(label, {
      label,
      rawLabel: current?.rawLabel ?? item.referrer,
      meta: item.referrer === "direct" || !item.referrer ? "Typed, bookmarked, or unknown" : "Referral traffic",
      value: (current?.value ?? 0) + item.views,
    });
  }
  return [...grouped.values()].sort((a, b) => b.value - a.value);
};

export function AnalyticsPanel({
  summary,
  status,
  rangeDays,
  onRangeChange,
  onRefresh,
}: AnalyticsPanelProps) {
  const series = summary?.timeSeries ?? [];
  const viewsPerSession = summary?.totalSessions
    ? summary.totalViews / summary.totalSessions
    : 0;
  const clickRate = summary?.totalViews
    ? (summary.totalClicks / summary.totalViews) * 100
    : 0;
  const isLoading = status.toLowerCase().includes("loading");
  const hasError = /unable|error|failed/i.test(status);
  const metricCards = [
    {
      label: "Page views",
      value: formatNumber(summary?.totalViews ?? 0),
      note: `${formatNumber(summary?.uniquePaths ?? 0)} unique pages`,
      tone: "bg-violet-500",
    },
    {
      label: "Visitors",
      value: formatNumber(summary?.totalVisitors ?? 0),
      note: "Unique browsers",
      tone: "bg-emerald-500",
    },
    {
      label: "Sessions",
      value: formatNumber(summary?.totalSessions ?? 0),
      note: `${viewsPerSession.toFixed(1)} views per session`,
      tone: "bg-sky-500",
    },
    {
      label: "Tracked clicks",
      value: formatNumber(summary?.totalClicks ?? 0),
      note: `${percentFormatter.format(clickRate)}% of page views`,
      tone: "bg-amber-500",
    },
    {
      label: "Bounce rate",
      value: `${percentFormatter.format(summary?.bounceRate ?? 0)}%`,
      note: "Single-event sessions",
      tone: "bg-rose-500",
    },
  ];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-600" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-violet-700">
              First-party analytics
            </p>
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#101828]">
            Website performance
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#667085]">
            Understand what people view, where they arrive from, and which actions they take.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="sr-only" htmlFor="analytics-range">Analytics date range</label>
          <select
            id="analytics-range"
            value={rangeDays}
            onChange={(event) => onRangeChange(Number(event.target.value))}
            className="h-11 min-w-0 flex-1 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm font-semibold text-[#344054] shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 sm:h-10 sm:flex-none sm:text-xs"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 12 months</option>
          </select>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#101828] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 sm:h-10"
          >
            <svg className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 7v5h-5M4 17v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.2 9A7 7 0 0 0 6.4 6.4L4 9M5.8 15A7 7 0 0 0 17.6 17.6L20 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isLoading ? "Loading" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metricCards.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-[#e4e7ec] bg-white p-4 shadow-sm last:col-span-2 lg:last:col-span-1">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${metric.tone}`} />
              <p className="text-xs font-bold text-[#667085]">{metric.label}</p>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-[#101828]">{metric.value}</p>
            <p className="mt-1 text-[11px] font-semibold text-[#98a2b3]">{metric.note}</p>
          </article>
        ))}
      </div>

      <article className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eaecf0] px-5 py-4">
          <div>
            <h3 className="text-base font-extrabold tracking-[-0.02em] text-[#101828]">Traffic over time</h3>
            <p className="mt-1 text-xs font-medium text-[#667085]">
              Hover or focus the chart to inspect each day.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-[#667085]">
            <ChartLegend color="bg-violet-600" label="Views" />
            <ChartLegend color="bg-emerald-500" label="Visitors" />
            <ChartLegend color="bg-amber-500" label="Clicks" />
          </div>
        </div>

        <div className="relative h-[280px] w-full px-2 pb-3 pt-5 sm:h-[340px] sm:px-4">
          {!summary && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/70">
              <p className="text-sm font-bold text-[#667085]">{status}</p>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -10 }} accessibilityLayer>
              <defs>
                <linearGradient id="analyticsViewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.015} />
                </linearGradient>
                <linearGradient id="analyticsVisitorsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.13} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eef2f6" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                minTickGap={32}
                tick={{ fill: "#98a2b3", fontSize: 11, fontWeight: 600 }}
                tickFormatter={(value) => formatDate(String(value))}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={44}
                tick={{ fill: "#98a2b3", fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ stroke: "#98a2b3", strokeDasharray: "4 4", strokeWidth: 1 }}
                contentStyle={{
                  border: "1px solid #e4e7ec",
                  borderRadius: 12,
                  boxShadow: "0 12px 30px rgba(16,24,40,.14)",
                  color: "#101828",
                  fontSize: 12,
                  fontWeight: 700,
                }}
                labelStyle={{ color: "#667085", fontSize: 11, marginBottom: 8 }}
                labelFormatter={(value) => formatDate(String(value), true)}
                formatter={(value, name) => [formatNumber(Number(value || 0)), String(name)]}
              />
              <Area
                type="monotone"
                dataKey="views"
                name="Page views"
                stroke="#7c3aed"
                strokeWidth={2.5}
                fill="url(#analyticsViewsFill)"
                activeDot={{ r: 5, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name="Visitors"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#analyticsVisitorsFill)"
                activeDot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                name="Clicks"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between border-t border-[#f2f4f7] px-5 py-3">
          <p className={`text-[11px] font-semibold ${hasError ? "text-rose-600" : "text-[#667085]"}`}>{status}</p>
          <p className="text-[11px] font-semibold text-[#98a2b3]">{rangeDays}-day window</p>
        </div>
      </article>

      <TopPagesTable summary={summary} />

      <div className="grid gap-5 xl:grid-cols-2">
        <RankedListCard
          title="Top clicks"
          description="The links and actions people used most."
          valueLabel="clicks"
          empty="No clicks recorded yet."
          rows={(summary?.topClicks ?? []).map((item) => ({
            label: displayTarget(item.target),
            rawLabel: item.target,
            meta: item.path,
            value: item.clicks,
          }))}
        />
        <RankedListCard
          title="Referrers"
          description="Where visitors arrived from."
          valueLabel="views"
          empty="No referrers recorded yet."
          rows={referrerRows(summary)}
        />
      </div>
    </section>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function TopPagesTable({ summary }: { summary: ViewAnalyticsSummary | null }) {
  const rows = summary?.topPaths.slice(0, 10) ?? [];
  const totalViews = Math.max(1, summary?.totalViews ?? 0);

  return (
    <article className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#eaecf0] px-5 py-4">
        <div>
          <h3 className="text-base font-extrabold tracking-[-0.02em] text-[#101828]">Top pages</h3>
          <p className="mt-1 text-xs font-medium text-[#667085]">Pages ranked by views in this period.</p>
        </div>
        <p className="text-[11px] font-bold text-[#98a2b3]">Showing {rows.length} of {summary?.topPaths.length ?? 0}</p>
      </div>
      {rows.length ? (
        <>
        <div className="grid gap-3 p-3 md:hidden">
          {rows.map((item, index) => {
            const share = (item.views / totalViews) * 100;
            return (
              <article key={item.path} className="rounded-xl border border-[#e4e7ec] bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#f2f4f7] text-xs font-bold text-[#667085]">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#101828]">{item.title || item.path}</p>
                    <p className="mt-1 truncate text-xs text-[#667085]">{item.path}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#101828]">{formatNumber(item.views)}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#98a2b3]">views</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f2f4f7]">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, share)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-[#667085]">{percentFormatter.format(share)}%</span>
                </div>
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#eaecf0] bg-[#f9fafb] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#667085]">
                <th className="w-14 px-5 py-3">#</th>
                <th className="px-3 py-3">Page</th>
                <th className="w-48 px-3 py-3">Share of traffic</th>
                <th className="w-24 px-3 py-3 text-right">Views</th>
                <th className="w-28 px-5 py-3 text-right">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f7]">
              {rows.map((item, index) => {
                const share = (item.views / totalViews) * 100;
                return (
                  <tr key={item.path} className="transition hover:bg-violet-50/30">
                    <td className="px-5 py-3.5">
                      <span className="grid h-6 w-6 place-items-center rounded-md bg-[#f2f4f7] text-[10px] font-extrabold text-[#667085]">{index + 1}</span>
                    </td>
                    <td className="max-w-0 px-3 py-3.5">
                      <p className="truncate text-sm font-extrabold text-[#101828]">{item.title || item.path}</p>
                      <p className="mt-1 truncate text-[11px] font-semibold text-[#98a2b3]">{item.path}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f2f4f7]">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, share)}%` }} />
                        </div>
                        <span className="w-10 text-right text-[11px] font-bold text-[#667085]">{percentFormatter.format(share)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right text-sm font-extrabold text-[#101828]">{formatNumber(item.views)}</td>
                    <td className="px-5 py-3.5 text-right text-[11px] font-semibold text-[#667085]">{formatLastSeen(item.lastViewedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      ) : (
        <EmptyAnalyticsState message="No page views recorded for this range." />
      )}
    </article>
  );
}

function RankedListCard({
  title,
  description,
  valueLabel,
  empty,
  rows,
}: {
  title: string;
  description: string;
  valueLabel: string;
  empty: string;
  rows: Array<{ label: string; rawLabel?: string; meta: string; value: number }>;
}) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  return (
    <article className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-sm">
      <div className="border-b border-[#eaecf0] px-5 py-4">
        <h3 className="text-base font-extrabold tracking-[-0.02em] text-[#101828]">{title}</h3>
        <p className="mt-1 text-xs font-medium text-[#667085]">{description}</p>
      </div>
      {rows.length ? (
        <ol className="divide-y divide-[#f2f4f7]">
          {rows.slice(0, 8).map((row, index) => (
            <li key={`${row.rawLabel || row.label}-${row.meta}`} className="grid grid-cols-[28px_minmax(0,1fr)_64px] items-center gap-3 px-5 py-3.5 transition hover:bg-[#f9fafb]">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-[#f2f4f7] text-[10px] font-extrabold text-[#667085]">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[#101828]" title={row.rawLabel || row.label}>{row.label}</p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-[#98a2b3]">{row.meta}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#f2f4f7]">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(3, (row.value / maxValue) * 100)}%` }} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold text-[#101828]">{formatNumber(row.value)}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#98a2b3]">{valueLabel}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyAnalyticsState message={empty} />
      )}
    </article>
  );
}

function EmptyAnalyticsState({ message }: { message: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#f2f4f7] text-[#98a2b3]">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 19V9M12 19V5M19 19v-7M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-bold text-[#667085]">{message}</p>
      <p className="mt-1 text-xs text-[#98a2b3]">Open the published site to start collecting analytics.</p>
    </div>
  );
}
