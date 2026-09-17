import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import postgres from "postgres";
import { readRuntimeEnv } from "./storage/env";

type AnalyticsEnv = Record<string, string | undefined>;

export type AnalyticsEventInput = {
  eventType?: "page_view" | "click";
  path: string;
  title?: string;
  target?: string;
  referrer?: string;
  userAgent?: string;
  sessionId?: string;
  visitorId?: string;
  country?: string;
};

export type ViewMetric = {
  path: string;
  title: string;
  views: number;
  lastViewedAt: string;
};

export type ClickMetric = {
  target: string;
  path: string;
  clicks: number;
  lastClickedAt: string;
};

export type ReferrerMetric = {
  referrer: string;
  views: number;
};

export type TimeSeriesPoint = {
  date: string;
  views: number;
  visitors: number;
  sessions: number;
  clicks: number;
};

export type ViewAnalyticsSummary = {
  totalViews: number;
  totalClicks: number;
  totalSessions: number;
  totalVisitors: number;
  uniquePaths: number;
  bounceRate: number;
  rangeDays: number;
  topPaths: ViewMetric[];
  topClicks: ClickMetric[];
  topReferrers: ReferrerMetric[];
  timeSeries: TimeSeriesPoint[];
};

type StoredAnalyticsEvent = Required<Pick<AnalyticsEventInput, "path" | "title" | "target" | "referrer" | "userAgent" | "sessionId" | "visitorId" | "country">> & {
  eventType: "page_view" | "click";
  viewedAt: string;
};

type ViewAnalyticsStore = {
  totalViews: number;
  paths: Record<string, ViewMetric>;
  events: StoredAnalyticsEvent[];
};

const maxStoredEvents = 2000;
const localStorePath = () => resolve(process.cwd(), "content", "analytics", "views.json");
const normalizePath = (path: string) => {
  const value = path.trim() || "/";
  if (/^https?:\/\//i.test(value)) return new URL(value).pathname || "/";
  return value.startsWith("/") ? value : `/${value}`;
};
const clean = (value = "", limit = 500) => value.trim().slice(0, limit);
const eventDate = (event: { viewedAt?: string; viewed_at?: string }) => new Date((event.viewedAt || event.viewed_at) as string);
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const daysAgo = (days: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - Math.max(0, days - 1));
  return date;
};
const normalizeRangeDays = (value?: number) => Math.min(365, Math.max(1, Number(value || 30)));

const emptyStore = (): ViewAnalyticsStore => ({ totalViews: 0, paths: {}, events: [] });

const readLocalStore = async () => {
  try {
    const store = JSON.parse(await readFile(localStorePath(), "utf8")) as Partial<ViewAnalyticsStore>;
    return { ...emptyStore(), ...store, paths: store.paths || {}, events: store.events || [] };
  } catch {
    return emptyStore();
  }
};

const writeLocalStore = async (store: ViewAnalyticsStore) => {
  const path = localStorePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(store, null, 2)}\n`);
};

const databaseUrl = (env: AnalyticsEnv) => env.CMS_ANALYTICS_DATABASE_URL || env.CMS_DATABASE_URL || env.DATABASE_URL;
const createSql = (env: AnalyticsEnv) => postgres(databaseUrl(env)!, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 10 });
const tenantId = (env: AnalyticsEnv) => env.CMS_TENANT_ID || "local";
const siteId = (env: AnalyticsEnv) => env.CMS_SITE_ID || "main";

const ensureDatabaseSchema = async (sql: postgres.Sql) => {
  await sql`
    create table if not exists cms_analytics_events (
      id bigserial primary key,
      tenant_id text not null,
      site_id text not null,
      event_type text not null default 'page_view',
      path text not null,
      title text not null default '',
      target text not null default '',
      referrer text not null default '',
      user_agent text not null default '',
      session_id text not null default '',
      visitor_id text not null default '',
      country text not null default '',
      viewed_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists cms_analytics_events_site_type_idx
    on cms_analytics_events (tenant_id, site_id, event_type, viewed_at desc)
  `;
  await sql`
    create index if not exists cms_analytics_events_site_path_idx
    on cms_analytics_events (tenant_id, site_id, path, viewed_at desc)
  `;
  await sql`
    create table if not exists cms_page_views (
      id bigserial primary key,
      tenant_id text not null,
      site_id text not null,
      path text not null,
      title text not null default '',
      referrer text not null default '',
      user_agent text not null default '',
      viewed_at timestamptz not null default now()
    )
  `;
};

const normalizeEvent = (input: AnalyticsEventInput): StoredAnalyticsEvent => ({
  eventType: input.eventType === "click" ? "click" : "page_view",
  path: normalizePath(input.path),
  title: clean(input.title, 180),
  target: clean(input.target, 180),
  referrer: clean(input.referrer, 500),
  userAgent: clean(input.userAgent, 500),
  sessionId: clean(input.sessionId, 120),
  visitorId: clean(input.visitorId, 120),
  country: clean(input.country, 80),
  viewedAt: new Date().toISOString(),
});

export const recordAnalyticsEvent = async (input: AnalyticsEventInput, env: AnalyticsEnv = readRuntimeEnv()) => {
  const event = normalizeEvent(input);

  if (databaseUrl(env)) {
    const sql = createSql(env);
    try {
      await ensureDatabaseSchema(sql);
      await sql`
        insert into cms_analytics_events (tenant_id, site_id, event_type, path, title, target, referrer, user_agent, session_id, visitor_id, country)
        values (${tenantId(env)}, ${siteId(env)}, ${event.eventType}, ${event.path}, ${event.title}, ${event.target}, ${event.referrer}, ${event.userAgent}, ${event.sessionId}, ${event.visitorId}, ${event.country})
      `;
      if (event.eventType === "page_view") {
        await sql`
          insert into cms_page_views (tenant_id, site_id, path, title, referrer, user_agent)
          values (${tenantId(env)}, ${siteId(env)}, ${event.path}, ${event.title}, ${event.referrer}, ${event.userAgent})
        `;
      }
    } finally {
      await sql.end({ timeout: 1 });
    }
    return;
  }

  const store = await readLocalStore();
  if (event.eventType === "page_view") {
    const metric = store.paths[event.path] ?? { path: event.path, title: event.title, views: 0, lastViewedAt: event.viewedAt };
    metric.title = event.title || metric.title;
    metric.views += 1;
    metric.lastViewedAt = event.viewedAt;
    store.totalViews += 1;
    store.paths[event.path] = metric;
  }
  store.events = [event, ...store.events].slice(0, maxStoredEvents);
  await writeLocalStore(store);
};

export const recordPageView = async (input: AnalyticsEventInput, env: AnalyticsEnv = readRuntimeEnv()) =>
  recordAnalyticsEvent({ ...input, eventType: "page_view" }, env);

const createEmptySeries = (rangeDays: number) => {
  const start = daysAgo(rangeDays);
  return Array.from({ length: rangeDays }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return { date: dayKey(date), views: 0, visitors: 0, sessions: 0, clicks: 0 };
  });
};

const summarizeEvents = (events: StoredAnalyticsEvent[], rangeDays: number): ViewAnalyticsSummary => {
  const start = daysAgo(rangeDays);
  const filtered = events.filter((event) => eventDate(event) >= start);
  const pageViews = filtered.filter((event) => event.eventType === "page_view");
  const clicks = filtered.filter((event) => event.eventType === "click");
  const sessions = new Map<string, StoredAnalyticsEvent[]>();
  const visitors = new Set<string>();
  const pathMap = new Map<string, ViewMetric>();
  const clickMap = new Map<string, ClickMetric>();
  const referrerMap = new Map<string, number>();
  const series = createEmptySeries(rangeDays);
  const seriesMap = new Map(series.map((point) => [point.date, point]));
  const dailyVisitors = new Map(series.map((point) => [point.date, new Set<string>()]));
  const dailySessions = new Map(series.map((point) => [point.date, new Set<string>()]));

  for (const event of filtered) {
    const sessionKey = event.sessionId || `${event.visitorId || "anonymous"}:${event.path}`;
    const date = dayKey(eventDate(event));
    sessions.set(sessionKey, [...(sessions.get(sessionKey) || []), event]);
    if (event.visitorId) visitors.add(event.visitorId);
    dailyVisitors.get(date)?.add(event.visitorId || sessionKey);
    dailySessions.get(date)?.add(sessionKey);
    const point = seriesMap.get(date);
    if (point) event.eventType === "click" ? point.clicks += 1 : point.views += 1;
  }

  for (const point of series) {
    point.visitors = dailyVisitors.get(point.date)?.size ?? 0;
    point.sessions = dailySessions.get(point.date)?.size ?? 0;
  }

  for (const event of pageViews) {
    const current = pathMap.get(event.path) ?? { path: event.path, title: event.title, views: 0, lastViewedAt: event.viewedAt };
    current.title = event.title || current.title;
    current.views += 1;
    if (event.viewedAt > current.lastViewedAt) current.lastViewedAt = event.viewedAt;
    pathMap.set(event.path, current);

    const referrer = event.referrer || "direct";
    referrerMap.set(referrer, (referrerMap.get(referrer) || 0) + 1);
  }

  for (const event of clicks) {
    const key = `${event.path}:${event.target || "unknown"}`;
    const current = clickMap.get(key) ?? { target: event.target || "unknown", path: event.path, clicks: 0, lastClickedAt: event.viewedAt };
    current.clicks += 1;
    if (event.viewedAt > current.lastClickedAt) current.lastClickedAt = event.viewedAt;
    clickMap.set(key, current);
  }

  const bounced = [...sessions.values()].filter((items) => items.length <= 1).length;
  return {
    totalViews: pageViews.length,
    totalClicks: clicks.length,
    totalSessions: sessions.size,
    totalVisitors: visitors.size || sessions.size,
    uniquePaths: pathMap.size,
    bounceRate: sessions.size ? Math.round((bounced / sessions.size) * 1000) / 10 : 0,
    rangeDays,
    topPaths: [...pathMap.values()].sort((a, b) => b.views - a.views || b.lastViewedAt.localeCompare(a.lastViewedAt)).slice(0, 25),
    topClicks: [...clickMap.values()].sort((a, b) => b.clicks - a.clicks || b.lastClickedAt.localeCompare(a.lastClickedAt)).slice(0, 10),
    topReferrers: [...referrerMap.entries()].map(([referrer, views]) => ({ referrer, views })).sort((a, b) => b.views - a.views).slice(0, 10),
    timeSeries: series,
  };
};

export const getViewAnalyticsSummary = async (env: AnalyticsEnv = readRuntimeEnv(), options: { rangeDays?: number } = {}): Promise<ViewAnalyticsSummary> => {
  const rangeDays = normalizeRangeDays(options.rangeDays);

  if (databaseUrl(env)) {
    const sql = createSql(env);
    try {
      await ensureDatabaseSchema(sql);
      const start = daysAgo(rangeDays).toISOString();
      const rows = await sql`
        select event_type, path, title, target, referrer, user_agent, session_id, visitor_id, country, viewed_at
        from cms_analytics_events
        where tenant_id = ${tenantId(env)} and site_id = ${siteId(env)} and viewed_at >= ${start}
        order by viewed_at desc
        limit 10000
      `;
      return summarizeEvents(rows.map((row) => ({
        eventType: row.event_type === "click" ? "click" : "page_view",
        path: String(row.path || "/"),
        title: String(row.title || ""),
        target: String(row.target || ""),
        referrer: String(row.referrer || ""),
        userAgent: String(row.user_agent || ""),
        sessionId: String(row.session_id || ""),
        visitorId: String(row.visitor_id || ""),
        country: String(row.country || ""),
        viewedAt: new Date(row.viewed_at as string).toISOString(),
      })), rangeDays);
    } finally {
      await sql.end({ timeout: 1 });
    }
  }

  const store = await readLocalStore();
  return summarizeEvents(store.events, rangeDays);
};
