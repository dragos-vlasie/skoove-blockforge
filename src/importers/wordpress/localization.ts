import type {
  WordPressLocaleCandidate,
  WordPressLocalizationManifest,
  WordPressSiteAudit,
} from "./types";

const trimSlash = (value: string) => value.replace(/\/+$/, "");

const canonicalCode = (value: string) => {
  try {
    return Intl.getCanonicalLocales(value)[0] ?? value;
  } catch {
    return value;
  }
};

const attributes = (tag: string) => {
  const values: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    values[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return values;
};

export const parseWordPressLocaleLinks = (html: string, siteUrl: string) => {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((attrs) => attrs.rel?.toLowerCase().split(/\s+/).includes("alternate") && attrs.hreflang && attrs.href)
    .map((attrs) => ({ hreflang: attrs.hreflang, url: new URL(attrs.href, siteUrl).href }));
  const xDefault = links.find((link) => link.hreflang.toLowerCase() === "x-default")?.url;
  const htmlLanguage = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1];
  const localized = links.filter((link) => link.hreflang.toLowerCase() !== "x-default");
  const seen = new Set<string>();

  const values = localized.flatMap((link) => {
    const code = canonicalCode(link.hreflang);
    if (seen.has(code.toLowerCase())) return [];
    seen.add(code.toLowerCase());
    const isDefault = Boolean(xDefault && trimSlash(link.url) === trimSlash(xDefault));
    return [{
      code,
      hreflang: link.hreflang,
      url: link.url,
      pathPrefix: isDefault ? "" : code.toLowerCase(),
      source: "hreflang" as const,
      isDefault,
    }];
  });

  if (values.length > 0) return values;
  const code = canonicalCode(htmlLanguage || "en");
  return [{
    code,
    hreflang: code,
    url: siteUrl,
    pathPrefix: "",
    source: "html-lang" as const,
    isDefault: true,
  }];
};

const restSummary = async (siteUrl: string, locale: string) => {
  const api = `${trimSlash(siteUrl)}/wp-json/wp/v2`;
  try {
    const [posts, pages] = await Promise.all([
      fetch(`${api}/posts?per_page=1&_fields=id,link&lang=${encodeURIComponent(locale)}`),
      fetch(`${api}/pages?per_page=1&_fields=id,link&lang=${encodeURIComponent(locale)}`),
    ]);
    if (!posts.ok || !pages.ok) throw new Error(`REST returned ${posts.status}/${pages.status}`);
    const sample = await posts.json() as Array<{ link?: string }>;
    return {
      reachable: true,
      posts: Number(posts.headers.get("x-wp-total") ?? 0),
      pages: Number(pages.headers.get("x-wp-total") ?? 0),
      sampleUrl: sample[0]?.link,
    };
  } catch (error) {
    return {
      reachable: false,
      posts: 0,
      pages: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export async function detectWordPressLocalization(
  siteUrl: string,
  options: { locales?: string[]; defaultLocale?: string } = {},
): Promise<WordPressLocalizationManifest> {
  const normalizedSiteUrl = trimSlash(siteUrl);
  const response = await fetch(normalizedSiteUrl, { headers: { accept: "text/html" } });
  if (!response.ok) throw new Error(`Unable to inspect WordPress homepage (${response.status}).`);
  const detected = parseWordPressLocaleLinks(await response.text(), normalizedSiteUrl);
  const requested = options.locales?.length
    ? options.locales.map((code) => {
        const canonical = canonicalCode(code.trim());
        const match = detected.find((candidate) => candidate.code.toLowerCase() === canonical.toLowerCase());
        return match ?? {
          code: canonical,
          hreflang: canonical,
          url: normalizedSiteUrl,
          pathPrefix: canonical.toLowerCase(),
          source: "configured" as const,
          isDefault: false,
        };
      })
    : detected;
  const defaultLocale = canonicalCode(
    options.defaultLocale || requested.find((locale) => locale.isDefault)?.code || requested[0]?.code || "en",
  );
  const locales: WordPressLocaleCandidate[] = await Promise.all(
    requested.map(async (locale) => ({
      ...locale,
      isDefault: locale.code.toLowerCase() === defaultLocale.toLowerCase(),
      rest: await restSummary(normalizedSiteUrl, locale.code),
    })),
  );

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    siteUrl: normalizedSiteUrl,
    defaultLocale,
    locales,
    notes: [
      "Locale candidates come from HTML hreflang, the html lang attribute, or explicit CLI configuration.",
      "A reachable REST query does not prove that a WordPress multilingual plugin applied the lang filter; review counts and sample URLs before importing all locales.",
      "Translation grouping remains explicit because WPML, Polylang, MultilingualPress, and custom APIs expose relationships differently.",
    ],
  };
}

export const mergeWordPressAudits = (audits: WordPressSiteAudit[]): WordPressSiteAudit => {
  if (!audits.length) throw new Error("At least one WordPress audit is required.");
  const [first] = audits;
  const collections = Object.fromEntries(
    Object.keys(first.collections).map((key) => {
      const summaries = audits.map((audit) => audit.collections[key]).filter(Boolean);
      return [key, {
        endpoint: summaries[0]?.endpoint ?? key,
        total: summaries.reduce((total, summary) => total + summary.total, 0),
        pages: summaries.reduce((total, summary) => total + summary.pages, 0),
      }];
    }),
  );
  const uniqueRoutes = new Map<string, WordPressSiteAudit["routes"][number]>();
  audits.flatMap((audit) => audit.routes).forEach((route) => {
    uniqueRoutes.set(`${route.locale ?? "default"}:${route.kind}:${route.id}`, route);
  });
  return {
    ...first,
    generatedAt: new Date().toISOString(),
    locale: undefined,
    collections,
    routes: [...uniqueRoutes.values()],
    categoryTree: audits.flatMap((audit) => audit.categoryTree),
    notes: [...new Set(audits.flatMap((audit) => audit.notes))],
  };
};
