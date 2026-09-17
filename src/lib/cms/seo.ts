import {
  Category,
  CollectionDefinition,
  CollectionEntry,
  ContentGraph,
  PageContent,
  SEOData,
  SiteConfig,
} from "../../../types";
import { getContentLocale } from "../../localization/registry";

type SeoSubject = PageContent | CollectionEntry | CollectionDefinition | Category;
type CollectionItem = { title: string; path: string };

const subjectTitle = (subject: SeoSubject) => ("title" in subject ? subject.title : subject.name);

export const absoluteUrl = (site: SiteConfig, pathOrUrl = "/") => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const siteUrl = site.siteUrl.replace(/\/+$/g, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteUrl}${path}`;
};

export const applyTitlePattern = (site: SiteConfig, title: string) => {
  if (!title) return site.siteName;
  if (title.includes(site.siteName)) return title;
  return site.defaultTitlePattern.replace("%s", title);
};

export const resolveSeo = (subject: SeoSubject, site: SiteConfig, path: string): Required<SEOData> => {
  const seo = subject.seo ?? ({} as SEOData);
  const title = applyTitlePattern(site, seo.title || subjectTitle(subject));
  const description = seo.description || ("description" in subject ? subject.description : "") || site.defaultDescription;
  const ogImage = absoluteUrl(site, seo.ogImage || site.defaultOgImage);

  return {
    title,
    description,
    ogImage,
    keywords: seo.keywords || "",
    canonical: seo.canonical ? absoluteUrl(site, seo.canonical) : absoluteUrl(site, path),
    robots: seo.robots || "index,follow",
    ogTitle: seo.ogTitle || title,
    ogDescription: seo.ogDescription || description,
    twitterCard: seo.twitterCard || "summary_large_image",
    schemaType: seo.schemaType || ("publicIndex" in subject ? "CollectionPage" : "WebPage"),
    changeFrequency: seo.changeFrequency || "weekly",
    sitemapPriority: seo.sitemapPriority ?? (path === "/" ? 1 : 0.7),
  };
};

export const isIndexableSeo = (seo?: SEOData) => !seo?.robots?.startsWith("noindex");

const organizationSchema = (site: SiteConfig) => ({
  "@type": "Organization",
  "@id": absoluteUrl(site, "/#organization"),
  name: site.organization.name || site.siteName,
  url: absoluteUrl(site, "/"),
  logo: site.organization.logo ? absoluteUrl(site, site.organization.logo) : undefined,
  sameAs: [...(site.organization.sameAs ?? []), ...(site.socialProfiles ?? [])],
});

const websiteSchema = (site: SiteConfig) => ({
  "@type": "WebSite",
  "@id": absoluteUrl(site, "/#website"),
  name: site.siteName,
  url: absoluteUrl(site, "/"),
  inLanguage: site.defaultLocale,
  publisher: { "@id": absoluteUrl(site, "/#organization") },
});

const breadcrumbSchema = (
  site: SiteConfig,
  crumbs: Array<{ name: string; path: string }>,
) => ({
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: absoluteUrl(site, crumb.path),
  })),
});

const baseWebPageSchema = (
  subject: SeoSubject,
  site: SiteConfig,
  path: string,
  seo: Required<SEOData>,
  schemaType: string,
) => ({
  "@type": schemaType,
  "@id": `${absoluteUrl(site, path)}#webpage`,
  url: absoluteUrl(site, path),
  name: seo.title,
  headline: subjectTitle(subject),
  description: seo.description,
  image: seo.ogImage ? absoluteUrl(site, seo.ogImage) : undefined,
  inLanguage: getContentLocale(subject, site),
  dateModified: "updatedAt" in subject ? subject.updatedAt : undefined,
  isPartOf: { "@id": absoluteUrl(site, "/#website") },
  publisher: { "@id": absoluteUrl(site, "/#organization") },
});

export const buildJsonLd = ({
  graph,
  subject,
  path,
  collection,
  crumbs,
  collectionItems,
}: {
  graph: ContentGraph;
  subject: SeoSubject;
  path: string;
  collection?: CollectionDefinition;
  crumbs?: Array<{ name: string; path: string }>;
  collectionItems?: CollectionItem[];
}) => {
  const seo = resolveSeo(subject, graph.site, path);
  const schemaType =
    "collectionId" in subject ? collection?.schemaType || seo.schemaType : seo.schemaType;

  const pageSchema = baseWebPageSchema(subject, graph.site, path, seo, schemaType);
  const subjectFields =
    "fields" in subject && !Array.isArray(subject.fields)
      ? subject.fields
      : undefined;

  if ("publishedAt" in subject && schemaType === "Article") {
    Object.assign(pageSchema, {
      mainEntityOfPage: { "@id": `${absoluteUrl(graph.site, path)}#webpage` },
      datePublished: subject.publishedAt,
      dateModified: subject.updatedAt,
      author: subject.author ? { "@type": "Person", name: subject.author } : organizationSchema(graph.site),
    });
  }

  if (subjectFields && schemaType === "Product") {
    Object.assign(pageSchema, {
      sku: subjectFields.sku,
      offers: subjectFields.price
        ? {
            "@type": "Offer",
            price: subjectFields.price,
            priceCurrency: subjectFields.priceCurrency || "USD",
            url: absoluteUrl(graph.site, path),
            availability: "https://schema.org/InStock",
          }
        : undefined,
    });
  }

  if (subjectFields && schemaType === "Person") {
    Object.assign(pageSchema, {
      jobTitle: subjectFields.role,
      image: subjectFields.photo ? absoluteUrl(graph.site, subjectFields.photo) : pageSchema.image,
    });
  }

  if (schemaType === "CollectionPage" && collectionItems?.length) {
    Object.assign(pageSchema, {
      mainEntity: {
        "@type": "ItemList",
        itemListElement: collectionItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.title,
          url: absoluteUrl(graph.site, item.path),
        })),
      },
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(graph.site),
      websiteSchema(graph.site),
      pageSchema,
      breadcrumbSchema(graph.site, crumbs ?? [{ name: "Home", path: "/" }, { name: subjectTitle(subject), path }]),
    ],
  };
};
