import type { ContentGraph } from "../../types";

const localeLabels: Record<string, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  ja: "日本語",
  ko: "한국어",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

type SkooveWordPressMigrationProfile = {
  id: string;
  name: string;
  transformGraph: (graph: ContentGraph) => ContentGraph;
};

export const profile: SkooveWordPressMigrationProfile = {
  id: "skoove-blog",
  name: "Skoove Blog",
  transformGraph: (graph) => {
    graph.site = {
      ...graph.site,
      siteName: "Skoove Blog",
      siteUrl: "https://www.skoove.com/blog",
      starterId: "journal-blog",
      enabledPacks: ["core", "editorial-publication"],
      logo: "https://www.skoove.com/blog/wp-content/uploads/2026/05/Skoove_White_180.png",
      defaultLocale: "en",
      locales: graph.site.locales?.map((locale) => ({
        ...locale,
        label: localeLabels[locale.code] ?? locale.code,
      })),
      localeRouting: {
        strategy: "explicit",
        categoryBasePath: "category",
      },
      defaultTitlePattern: "%s | Skoove",
      defaultDescription: "Piano learning guides, music theory and practical playing advice from Skoove.",
      design: {
        themeId: "journal-classic",
        primaryColor: "#00524f",
        accentColor: "#e27b4b",
        backgroundColor: "#ffffff",
        textColor: "#103133",
        headingFont: "Lato",
        bodyFont: "Lato",
        radius: "md",
      },
      organization: {
        name: "Skoove",
        logo: "https://www.skoove.com/blog/wp-content/uploads/2026/05/Skoove_White_180.png",
        sameAs: [],
      },
      socialProfiles: [],
    };
    graph.assets = [];
    return graph;
  },
};

export default profile;
