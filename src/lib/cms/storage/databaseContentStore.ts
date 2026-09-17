import postgres from "postgres";
import type { ContentGraph } from "../../../../types";
import { readRuntimeEnv } from "./env";
import { LocalFileContentStore } from "./localFileContentStore";
import {
  isMissingContentError,
  missingContentErrorPrefix,
  normalizeContentGraph,
} from "./splitContent";
import { ContentStoreConfigurationError, type ContentStore } from "./types";
import type { CmsWorkspaceScope } from "../workspaceTypes";

type StoreEnv = Record<string, string | undefined>;
type ContentSnapshotName = "draft" | "published";
type DatabaseSslMode = false | "require" | "allow" | "prefer" | "verify-full";

export type DatabaseContentStoreConfig = {
  databaseUrl: string;
  tenantId: string;
  siteId: string;
  autoMigrate: boolean;
  ssl?: DatabaseSslMode;
  publishWebhookUrl?: string;
};

export type DatabaseContentStoreDependencies = {
  sql?: postgres.Sql;
  fetch?: typeof fetch;
};

type DatabaseQueryClient = postgres.Sql | postgres.TransactionSql;

const readEnv = (env: StoreEnv, primary: string, fallback?: string) =>
  env[primary] || (fallback ? env[fallback] : undefined);

const envFlag = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined || value.trim() === "") return defaultValue;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
};

const readDatabaseSslMode = (value: string | undefined): DatabaseSslMode | undefined => {
  if (value === undefined || value.trim() === "") return undefined;

  const normalized = value.trim().toLowerCase();
  if (["0", "false", "no", "off", "disable", "disabled"].includes(normalized)) return false;
  if (["1", "true", "yes", "on", "require", "required"].includes(normalized)) return "require";
  if (normalized === "allow" || normalized === "prefer" || normalized === "verify-full") return normalized;

  throw new ContentStoreConfigurationError(
    `Unsupported CMS_DATABASE_SSL value "${value}". Use require, allow, prefer, verify-full, or false.`,
  );
};

export const createDatabaseContentStoreConfig = (
  env: StoreEnv = readRuntimeEnv(),
  scope?: CmsWorkspaceScope,
): DatabaseContentStoreConfig => {
  const databaseUrl = readEnv(env, "CMS_DATABASE_URL", "DATABASE_URL");

  if (!databaseUrl) {
    throw new ContentStoreConfigurationError(
      "CMS_CONTENT_STORE=database requires CMS_DATABASE_URL or DATABASE_URL.",
    );
  }

  const configuredTenantId = env.CMS_TENANT_ID || "local";
  const configuredSiteId = env.CMS_SITE_ID || "main";
  const scopeMatchesDeployment = !scope
    || (scope.tenantId === configuredTenantId && scope.siteId === configuredSiteId);

  return {
    databaseUrl,
    tenantId: scope?.tenantId || env.CMS_TENANT_ID || "local",
    siteId: scope?.siteId || env.CMS_SITE_ID || "main",
    autoMigrate: envFlag(env.CMS_DATABASE_AUTO_MIGRATE, true),
    ssl: readDatabaseSslMode(env.CMS_DATABASE_SSL),
    publishWebhookUrl: scopeMatchesDeployment
      ? env.CMS_PUBLISH_WEBHOOK_URL || env.NETLIFY_BUILD_HOOK_URL
      : undefined,
  };
};

const graphFromRow = (value: unknown, label: string): ContentGraph => {
  try {
    const graph = typeof value === "string" ? JSON.parse(value) : value;
    return normalizeContentGraph(graph as Partial<ContentGraph>);
  } catch (error) {
    throw new Error(`${label} could not be parsed as CMS JSON.`);
  }
};

export class DatabaseContentStore implements ContentStore {
  readonly mode = "database" as const;

  private readonly sql: postgres.Sql;
  private readonly tenantId: string;
  private readonly siteId: string;
  private readonly autoMigrate: boolean;
  private readonly publishWebhookUrl?: string;
  private readonly fetcher: typeof fetch;
  private readonly fallbackStore = new LocalFileContentStore();
  private schemaPromise: Promise<void> | null = null;

  constructor(
    config: DatabaseContentStoreConfig = createDatabaseContentStoreConfig(),
    dependencies: DatabaseContentStoreDependencies = {},
  ) {
    this.sql = dependencies.sql ?? postgres(config.databaseUrl, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
      ...(config.ssl === undefined ? {} : { ssl: config.ssl }),
    });
    this.tenantId = config.tenantId;
    this.siteId = config.siteId;
    this.autoMigrate = config.autoMigrate;
    this.publishWebhookUrl = config.publishWebhookUrl;
    this.fetcher = dependencies.fetch ?? fetch;
  }

  async getDraft() {
    try {
      return await this.readSnapshot("draft");
    } catch (error) {
      if (!isMissingContentError(error)) throw error;

      try {
        return await this.readSnapshot("published");
      } catch (publishedError) {
        if (!isMissingContentError(publishedError)) throw publishedError;
        return this.fallbackStore.getDraft();
      }
    }
  }

  async saveDraft(graph: ContentGraph) {
    const nextGraph = normalizeContentGraph({
      ...graph,
      updatedAt: new Date().toISOString(),
    });

    await this.ensureSchema();
    await this.sql.begin(async (sql) => {
      await this.ensureSite(sql);
      await this.writeSnapshot(sql, "draft", nextGraph, "Save CMS draft");
    });
    return nextGraph;
  }

  async getPublished() {
    try {
      return await this.readSnapshot("published");
    } catch (error) {
      if (!isMissingContentError(error)) throw error;

      try {
        return await this.readSnapshot("draft");
      } catch (draftError) {
        if (!isMissingContentError(draftError)) throw draftError;
        return this.fallbackStore.getPublished();
      }
    }
  }

  async publish(
    graph: ContentGraph,
    options: { publishedGraph?: ContentGraph; expectedPublishedUpdatedAt?: string } = {},
  ) {
    const nextGraph = normalizeContentGraph({
      ...graph,
      updatedAt: new Date().toISOString(),
    });
    const publishedGraph = normalizeContentGraph({
      ...(options.publishedGraph ?? nextGraph),
      updatedAt: nextGraph.updatedAt,
    });

    await this.ensureSchema();
    await this.sql.begin(async (sql) => {
      await this.ensureSite(sql);
      if (options.expectedPublishedUpdatedAt) {
        const rows = await sql`
          select graph_json
          from cms_content_snapshots
          where tenant_id = ${this.tenantId}
            and site_id = ${this.siteId}
            and status = 'published'
          for update
        `;
        if (rows.length === 0) {
          throw new Error("Publish the complete site once before publishing an individual page.");
        }
        const currentPublished = graphFromRow(rows[0].graph_json, "Database published snapshot");
        if (currentPublished.updatedAt !== options.expectedPublishedUpdatedAt) {
          throw new Error("Published content changed while this page was publishing. Retry the publish.");
        }
      }
      await this.writeSnapshot(sql, "draft", nextGraph, "Publish CMS content");
      await this.writeSnapshot(sql, "published", publishedGraph, "Publish CMS content");
    });

    const warnings = await this.triggerPublishWebhook();
    return { graph: nextGraph, warnings };
  }

  private async ensureSchema() {
    if (!this.autoMigrate) return;

    this.schemaPromise ??= this.createSchema();
    await this.schemaPromise;
  }

  private async ensureSite(sql: DatabaseQueryClient) {
    await sql`
      insert into cms_tenants (id, name, updated_at)
      values (${this.tenantId}, ${this.tenantId}, now())
      on conflict (id) do update set updated_at = now()
    `;

    await sql`
      insert into cms_sites (tenant_id, id, name, updated_at)
      values (${this.tenantId}, ${this.siteId}, ${this.siteId}, now())
      on conflict (tenant_id, id) do update set updated_at = now()
    `;
  }

  private async readSnapshot(snapshot: ContentSnapshotName) {
    await this.ensureSchema();

    const rows = await this.sql`
      select graph_json
      from cms_content_snapshots
      where tenant_id = ${this.tenantId}
        and site_id = ${this.siteId}
        and status = ${snapshot}
      limit 1
    `;

    if (rows.length === 0) {
      throw new Error(`${missingContentErrorPrefix} in database ${snapshot} snapshot.`);
    }

    return graphFromRow(rows[0].graph_json, `Database ${snapshot} snapshot`);
  }

  private async writeSnapshot(
    sql: DatabaseQueryClient,
    snapshot: ContentSnapshotName,
    graph: ContentGraph,
    message: string,
  ) {
    const graphJson = graph as unknown as postgres.JSONValue;
    const snapshotRows = await sql`
      insert into cms_content_snapshots (
        tenant_id,
        site_id,
        status,
        graph_json,
        version,
        created_at,
        updated_at
      )
      values (
        ${this.tenantId},
        ${this.siteId},
        ${snapshot},
        ${sql.json(graphJson)},
        1,
        now(),
        now()
      )
      on conflict (tenant_id, site_id, status)
      do update set
        graph_json = excluded.graph_json,
        version = cms_content_snapshots.version + 1,
        updated_at = now()
      returning version
    `;
    const version = Number(snapshotRows[0]?.version ?? 1);

    await sql`
      insert into cms_content_versions (
        tenant_id,
        site_id,
        status,
        version,
        graph_json,
        message,
        created_at
      )
      values (
        ${this.tenantId},
        ${this.siteId},
        ${snapshot},
        ${version},
        ${sql.json(graphJson)},
        ${message},
        now()
      )
    `;
  }

  private async createSchema() {
    await this.sql`
      create table if not exists cms_tenants (
        id text primary key,
        name text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;

    await this.sql`
      create table if not exists cms_sites (
        tenant_id text not null references cms_tenants(id) on delete cascade,
        id text not null,
        name text not null,
        development_mode text not null default 'managed'
          check (development_mode in ('managed', 'code')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (tenant_id, id)
      )
    `;

    await this.sql`
      alter table cms_sites
      add column if not exists development_mode text not null default 'managed'
      check (development_mode in ('managed', 'code'))
    `;

    await this.sql`
      create table if not exists cms_content_snapshots (
        tenant_id text not null,
        site_id text not null,
        status text not null check (status in ('draft', 'published')),
        version integer not null default 1,
        graph_json jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (tenant_id, site_id, status),
        foreign key (tenant_id, site_id) references cms_sites(tenant_id, id) on delete cascade
      )
    `;

    await this.sql`
      create table if not exists cms_content_versions (
        id bigserial primary key,
        tenant_id text not null,
        site_id text not null,
        status text not null check (status in ('draft', 'published')),
        version integer not null,
        graph_json jsonb not null,
        message text not null default '',
        created_at timestamptz not null default now(),
        foreign key (tenant_id, site_id) references cms_sites(tenant_id, id) on delete cascade
      )
    `;

    await this.sql`
      create index if not exists cms_content_versions_site_idx
      on cms_content_versions (tenant_id, site_id, status, created_at desc)
    `;
  }

  private async triggerPublishWebhook() {
    if (!this.publishWebhookUrl) return [];

    try {
      const response = await this.fetcher(this.publishWebhookUrl, { method: "POST" });
      if (!response.ok) {
        return [
          `Content was published, but the deployment hook failed (${response.status} ${response.statusText}).`,
        ];
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "request failed";
      return [`Content was published, but the deployment hook could not be reached (${reason}).`];
    }

    return [];
  }
}
