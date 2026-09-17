import pLimit from "p-limit";
import type {
  WordPressCollectionSummary,
  WordPressEntity,
  WordPressMedia,
  WordPressTerm,
  WordPressUser,
} from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 3;

export type WordPressClientOptions = {
  siteUrl: string;
  apiUrl?: string;
  timeoutMs?: number;
  retries?: number;
  concurrency?: number;
  userAgent?: string;
  locale?: string;
  localeQueryParameter?: string;
};

const trimSlash = (value: string) => value.replace(/\/+$/, "");

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const retryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;

export class WordPressClient {
  readonly siteUrl: string;
  readonly apiUrl: string;
  readonly locale?: string;
  readonly localeQueryParameter: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly userAgent: string;
  private readonly limit: ReturnType<typeof pLimit>;

  constructor(options: WordPressClientOptions) {
    this.siteUrl = trimSlash(options.siteUrl);
    this.apiUrl = trimSlash(options.apiUrl ?? `${this.siteUrl}/wp-json/wp/v2`);
    this.locale = options.locale;
    this.localeQueryParameter = options.localeQueryParameter ?? "lang";
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retries = options.retries ?? DEFAULT_RETRIES;
    this.userAgent = options.userAgent ?? "BlockForge WordPress migration importer";
    this.limit = pLimit(options.concurrency ?? 6);
  }

  private url(endpoint: string, params?: URLSearchParams | Record<string, string | number | boolean | undefined>) {
    const url = endpoint.startsWith("http")
      ? new URL(endpoint)
      : new URL(`${this.apiUrl}/${endpoint.replace(/^\/+/, "")}`);

    if (this.locale) url.searchParams.set(this.localeQueryParameter, this.locale);

    if (params instanceof URLSearchParams) {
      params.forEach((value, key) => url.searchParams.set(key, value));
    } else if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.set(key, String(value));
      });
    }

    return url;
  }

  async request<T>(
    endpoint: string,
    params?: URLSearchParams | Record<string, string | number | boolean | undefined>,
  ): Promise<{ data: T; response: Response }> {
    const url = this.url(endpoint, params);
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          headers: {
            accept: "application/json",
            "user-agent": this.userAgent,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text();
          const error = new Error(`WordPress request failed (${response.status}) ${url}: ${body.slice(0, 500)}`);
          if (!retryableStatus(response.status) || attempt === this.retries) throw error;
          lastError = error;
        } else {
          return { data: (await response.json()) as T, response };
        }
      } catch (error) {
        lastError = error;
        if (attempt === this.retries) break;
      } finally {
        clearTimeout(timeout);
      }

      await sleep(300 * 2 ** attempt);
    }

    throw lastError instanceof Error ? lastError : new Error(`WordPress request failed: ${url}`);
  }

  async collectionSummary(endpoint: string): Promise<WordPressCollectionSummary> {
    const { response } = await this.request<unknown[]>(endpoint, { per_page: 1, _fields: "id" });
    return {
      endpoint,
      total: Number(response.headers.get("x-wp-total") ?? 0),
      pages: Number(response.headers.get("x-wp-totalpages") ?? 0),
    };
  }

  async getAll<T>(endpoint: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T[]> {
    const first = await this.request<T[]>(endpoint, { ...params, per_page: 100, page: 1 });
    const pageCount = Number(first.response.headers.get("x-wp-totalpages") ?? 1);
    if (pageCount <= 1) return first.data;

    const remaining = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) => index + 2).map((page) =>
        this.limit(() => this.request<T[]>(endpoint, { ...params, per_page: 100, page }).then((result) => result.data)),
      ),
    );

    return [first.data, ...remaining].flat();
  }

  getPost(id: number) {
    return this.request<WordPressEntity>(`posts/${id}`, { _embed: true }).then((result) => result.data);
  }

  getPage(id: number) {
    return this.request<WordPressEntity>(`pages/${id}`, { _embed: true }).then((result) => result.data);
  }

  getPosts(fields?: string) {
    return this.getAll<WordPressEntity>("posts", { _fields: fields });
  }

  getPages(fields?: string) {
    return this.getAll<WordPressEntity>("pages", { _fields: fields });
  }

  getCategories(fields?: string) {
    return this.getAll<WordPressTerm>("categories", { _fields: fields });
  }

  getTags(fields?: string) {
    return this.getAll<WordPressTerm>("tags", { _fields: fields });
  }

  getMedia(id: number) {
    return this.request<WordPressMedia>(`media/${id}`).then((result) => result.data);
  }

  getUser(id: number) {
    return this.request<WordPressUser>(`users/${id}`).then((result) => result.data);
  }

  getUsers(fields?: string) {
    return this.getAll<WordPressUser>("users", { _fields: fields });
  }
}
