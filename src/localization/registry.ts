import type { LocaleConfig, LocalizedRecord, SiteConfig } from "../../types";

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");
const rtlLanguages = new Set(["ar", "dv", "fa", "he", "ku", "ps", "sd", "ug", "ur", "yi"]);

export const canonicalLocaleCode = (value: string) => {
  const candidate = value.trim();
  if (!candidate) return candidate;

  try {
    return Intl.getCanonicalLocales(candidate)[0] ?? candidate;
  } catch {
    return candidate;
  }
};

const defaultLocaleConfig = (code: string): LocaleConfig => ({
  code: canonicalLocaleCode(code),
  label: canonicalLocaleCode(code),
  hreflang: canonicalLocaleCode(code),
  direction: "ltr",
  enabled: true,
});

export const getConfiguredLocales = (site: SiteConfig): LocaleConfig[] => {
  const defaultLocale = canonicalLocaleCode(site.defaultLocale || "en");
  const configured: LocaleConfig[] = (site.locales ?? [])
    .filter((locale) => locale.enabled !== false)
    .map((locale) => ({
      ...locale,
      code: canonicalLocaleCode(locale.code),
      hreflang: canonicalLocaleCode(locale.hreflang || locale.code),
      direction: locale.direction ?? "ltr",
      enabled: true,
    }));
  const byCode = new Map(configured.map((locale) => [locale.code.toLowerCase(), locale]));

  if (!byCode.has(defaultLocale.toLowerCase())) {
    configured.unshift(defaultLocaleConfig(defaultLocale));
  }

  return configured.length > 0 ? configured : [defaultLocaleConfig(defaultLocale)];
};

export const getLocaleConfig = (site: SiteConfig, code?: string) => {
  const requested = canonicalLocaleCode(code || site.defaultLocale || "en");
  return (
    getConfiguredLocales(site).find((locale) => locale.code.toLowerCase() === requested.toLowerCase()) ??
    defaultLocaleConfig(requested)
  );
};

export const getContentLocale = (record: Pick<LocalizedRecord, "locale"> | undefined, site: SiteConfig) =>
  getLocaleConfig(site, record?.locale || site.defaultLocale).code;

export const getLocaleDirection = (site: SiteConfig, code?: string) =>
  getLocaleConfig(site, code).direction ?? "ltr";

export const inferLocaleDirection = (code: string) =>
  rtlLanguages.has(code.toLowerCase().split("-")[0] ?? "") ? "rtl" as const : "ltr" as const;

export const getLocalePrefix = (site: SiteConfig, code?: string) => {
  const locale = getLocaleConfig(site, code);
  const strategy = site.localeRouting?.strategy ?? "prefix-except-default";
  const isDefault = locale.code.toLowerCase() === canonicalLocaleCode(site.defaultLocale).toLowerCase();

  if (strategy === "explicit" || (strategy === "prefix-except-default" && isDefault)) return "";
  return trimSlashes(locale.pathPrefix ?? locale.code.toLowerCase());
};

export const applyLocalePrefix = (path: string, site: SiteConfig, code?: string) => {
  const normalizedPath = trimSlashes(path);
  const prefix = getLocalePrefix(site, code);
  const combined = [prefix, normalizedPath].filter(Boolean).join("/");
  return combined ? `/${combined}/` : "/";
};

export const getLocalizedHomePath = (site: SiteConfig, code?: string) =>
  applyLocalePrefix("/", site, code);

export const defineLocalization = <T extends Pick<SiteConfig, "defaultLocale" | "locales" | "localeRouting">>(
  config: T,
) => config;
