import { StructuredTextRenderer } from "../../blocks/text/View";
import { getCategoryEntries, getCategoryPath, getCollectionEntries, getEntryPath, getPublishedEntries } from "../../lib/cms/routing";
import { getContentLocale } from "../../localization/registry";
import { PublicImage } from "../../ui/PublicImage";
import { BlockRenderer } from "../../next/BlockRenderer";
import { getSkooveHomePath } from "./SkooveChrome";

const entryImage = (entry: any) => entry.fields?.featuredImage || entry.fields?.image || entry.seo?.ogImage || "";

const nodeText = (node: any): string => node?.type === "text"
  ? node.text ?? ""
  : (node?.content ?? []).map(nodeText).join("");

const nodeLink = (node: any): string => {
  if (node?.type === "text") return node.marks?.find((mark: any) => mark.type === "link")?.attrs?.href ?? "";
  return (node?.content ?? []).map(nodeLink).find(Boolean) ?? "";
};

const blockText = (block: any) => nodeText(block?.content?.nodes).replace(/\s+/g, " ").trim();

const faqLabels = new Set([
  "faq",
  "frequently asked questions",
  "preguntas frecuentes",
  "häufig gestellte fragen",
  "questions fréquentes",
  "よくある質問",
  "자주 묻는 질문",
  "常见问题",
  "常見問題",
]);

const hasFaqHeading = (block: any) => (block?.content?.nodes?.content ?? []).some((node: any) =>
  node.type === "heading" && faqLabels.has(nodeText(node).replace(/\s+/g, " ").trim().toLowerCase()),
);

const findFaqSection = (blocks: any[]) => {
  const headingIndex = blocks.findIndex(hasFaqHeading);
  if (headingIndex < 0) return null;

  const items: Array<{ question: string; answerBlock: any }> = [];
  let cursor = headingIndex + 1;
  while (cursor + 1 < blocks.length) {
    const questionBlock = blocks[cursor];
    const answerBlock = blocks[cursor + 1];
    const question = blockText(questionBlock);
    if (questionBlock?.type !== "TEXT" || answerBlock?.type !== "TEXT" || !/[?？]$/.test(question)) break;
    items.push({ question, answerBlock });
    cursor += 2;
  }

  return items.length >= 2 ? { start: headingIndex + 1, end: cursor, items } : null;
};

const authorLabelPattern = /(author of this blog post|autor(?:in)? (?:dieses|de este)|auteur de cet article|この記事の著者|이 블로그 게시물의 작성자|本文作者|本文作者)/i;

const normalizedSkooveAsset = (source: string) => {
  if (!source) return source;
  try {
    const url = new URL(source, "https://www.skoove.com");
    if (url.hostname.endsWith("sg-host.com")) return `https://www.skoove.com/blog${url.pathname}${url.search}`;
    if (url.hostname === "www.skoove.com") return url.href;
  } catch {
    if (source.startsWith("/wp-content/")) return `https://www.skoove.com/blog${source}`;
  }
  return source;
};

const skooveVimeoEmbedUrl = (content: any) => {
  const raw = typeof content?.embedUrl === "string"
    ? content.embedUrl.trim()
    : typeof content?.iframeHtml === "string"
      ? content.iframeHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] ?? ""
      : "";
  if (!raw) return "";

  try {
    const source = new URL(raw.replaceAll("&amp;", "&"));
    if (source.protocol !== "https:" && source.protocol !== "http:") return "";
    if (source.hostname !== "vimeo.com" && !source.hostname.endsWith(".vimeo.com")) return "";

    const id = source.pathname.match(/\/(\d+)/)?.[1];
    if (!id) return "";

    const embed = source.hostname === "player.vimeo.com"
      ? new URL(source.href)
      : new URL(`https://player.vimeo.com/video/${id}`);
    embed.protocol = "https:";
    embed.hostname = "player.vimeo.com";
    embed.searchParams.set("dnt", "1");
    return embed.href;
  } catch {
    return "";
  }
};

const linkedText = (node: any): { href: string; label: string } | null => {
  if (node?.type === "text") {
    const href = node.marks?.find((mark: any) => mark.type === "link")?.attrs?.href;
    return href ? { href, label: node.text ?? "" } : null;
  }
  return (node?.content ?? []).map(linkedText).find(Boolean) ?? null;
};

const findAuthorSection = (blocks: any[]) => {
  const start = blocks.findIndex((block: any, index: number) => {
    if (block?.type !== "TEXT" || blocks[index + 1]?.type !== "IMAGE_GALLERY") return false;
    const nodes = block.content?.nodes?.content ?? [];
    return authorLabelPattern.test(blockText(block)) || nodes.some((node: any) => node.type === "horizontalRule");
  });
  if (start < 0) return null;

  const headingBlock = blocks[start];
  const imageBlock = blocks[start + 1];
  const image = imageBlock.content?.images?.[0];
  const imageSource = typeof image === "string" ? image : image?.src;
  const imageAlt = typeof image === "string" ? "" : image?.alt ?? "";
  const cta = linkedText(headingBlock.content?.nodes);
  const rawHeading = blockText(headingBlock).replace(cta?.label ?? "", "").trim();
  const authorName = imageAlt || rawHeading.split(":").slice(1).join(":").trim();
  const label = rawHeading.includes(":") ? `${rawHeading.split(":")[0]}:` : "Author of this blog post:";
  const bioBlock = blocks[start + 2]?.type === "TEXT" ? blocks[start + 2] : null;
  const bio = bioBlock ? blockText(bioBlock) : "";
  const editorial: string[] = [];
  let end = start + (bioBlock ? 3 : 2);
  while (end < blocks.length && blocks[end]?.type === "TEXT") {
    const text = blockText(blocks[end]);
    if (!text) break;
    editorial.push(text);
    end += 1;
  }

  return { start, end, cta, label, authorName, imageSource: normalizedSkooveAsset(imageSource ?? ""), bio, editorial };
};

const sidebarCopy: Record<string, { title: string; button: string }> = {
  en: { title: "Learn to play your favorite songs", button: "Start my free trial" },
  de: { title: "Lerne deine Lieblingssongs zu spielen", button: "Jetzt starten" },
  fr: { title: "Apprenez à jouer vos chansons préférées", button: "Commencer votre essai gratuit" },
  es: { title: "Aprende a tocar tus canciones favoritas", button: "Comienza tu prueba gratis" },
  ja: { title: "お気に入りの曲でピアノを習いましょう", button: "無料トライアルを始める" },
  ko: { title: "좋아하는 곡을 연주하는 법을 배워보세요", button: "무료 체험 시작" },
  "zh-Hans": { title: "学习演奏你最喜欢的曲目", button: "开启你的免费试用" },
  "zh-Hant": { title: "學習演奏你最喜歡的曲目", button: "開啟你的免費試用" },
};

const sidebarHref = (locale: string) => {
  const localePath = locale === "en" ? "" : `/${locale === "zh-Hans" ? "zh-CN" : locale === "zh-Hant" ? "zh-TW" : locale}`;
  return `https://www.skoove.com${localePath}/auth/register_promotion?coupon=7d-blog-npd&utm_source=blog&utm_medium=sidebar&utm_campaign=7d-blog-npd`;
};

function ArticleSidebar({ locale }: { locale: string }) {
  const labels = sidebarCopy[locale] ?? sidebarCopy.en;
  return <aside className="hidden min-w-0 lg:block" aria-label={labels.title}>
    <div className="sticky top-5">
      <div className="overflow-hidden bg-[#ecf1f1] pb-8 text-center">
        <PublicImage className="h-auto w-full" src="https://www.skoove.com/blog/wp-content/uploads/2024/09/optimized/iPhone15-2A-1-1-720.webp" alt="The Skoove piano learning app" width={720} height={621} sizes="(max-width: 1279px) 25vw, 306px" loading="lazy" />
        <h2 className="mx-auto mb-0 mt-6 max-w-[15rem] px-4 text-[1.65rem] font-black leading-[1.12]">{labels.title}</h2>
        <a className="mx-auto mt-7 inline-flex min-h-12 items-center justify-center bg-[#e97c43] px-5 text-lg font-bold text-white no-underline transition hover:bg-[#d86b34]" href={sidebarHref(locale)}>{labels.button}</a>
      </div>
      <div className="mt-4 grid gap-2 px-5">
        <a href="https://apps.apple.com/us/app/skoove-learn-to-play-piano/id1160668178" aria-label="Download Skoove on the App Store"><PublicImage className="h-auto w-full" src="https://www.skoove.com/blog/wp-content/uploads/2024/09/badge-app-store.png" alt="Download on the App Store" width={354} height={112} sizes="250px" loading="lazy" /></a>
        <a href="https://play.google.com/store/apps/details?id=com.skoove.piano" aria-label="Get Skoove on Google Play"><PublicImage className="h-auto w-full" src="https://www.skoove.com/blog/wp-content/uploads/2024/09/badge-google-play.png" alt="Get it on Google Play" width={354} height={112} sizes="250px" loading="lazy" /></a>
      </div>
    </div>
  </aside>;
}

function FaqAccordion({ items, graph, entry }: { items: Array<{ question: string; answerBlock: any }>; graph: any; entry: any }) {
  return <section className="my-5 border-t border-[#d5d8dc]" aria-label="Frequently asked questions">
    {items.map((item, index) => <details className="group border-b border-[#d5d8dc]" key={`${item.question}-${index}`}>
      <summary className="flex min-h-[5rem] cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 text-xl font-black leading-tight marker:hidden sm:text-[1.55rem] [&::-webkit-details-marker]:hidden">
        <span>{item.question}</span>
        <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-[#2ec39f] text-2xl font-normal leading-none text-white" aria-hidden="true"><i className="not-italic transition group-open:rotate-45">+</i></span>
      </summary>
      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-open:grid-rows-[1fr]"><div className="overflow-hidden"><div className="px-5 pb-6 [&_section]:!py-0 [&_section>div]:!max-w-none [&_p]:!my-0 [&_p]:!text-base [&_p]:!leading-7"><BlockRenderer block={item.answerBlock} graph={graph} subject={entry} /></div></div></div>
    </details>)}
  </section>;
}

function AuthorSection({ section }: { section: NonNullable<ReturnType<typeof findAuthorSection>> }) {
  return <section className="mt-12 border-t border-[#c7cdcd] pt-9 text-center">
    {section.cta && <a className="mb-8 inline-flex min-h-14 items-center justify-center bg-[#e97c43] px-14 text-lg font-bold text-white no-underline transition hover:bg-[#d86b34]" href={section.cta.href}>{section.cta.label}</a>}
    <p className="mb-0 mt-1 text-xl leading-8"><strong className="block font-black">{section.label}</strong>{section.authorName}</p>
    {section.imageSource && <PublicImage className="mx-auto mt-5 size-64 object-contain" src={section.imageSource} alt={section.authorName} width={260} height={260} sizes="260px" loading="lazy" />}
    {section.bio && <p className="mx-auto mt-7 max-w-[58rem] text-lg leading-[1.5]">{section.bio}</p>}
    {section.editorial.length > 0 && <div className="mt-8 border-2 border-[#2ec39f] bg-[#fafafa] px-5 py-4 text-left">{section.editorial.map((text, index) => <p className="my-1 text-lg leading-8" key={index}>{text}</p>)}</div>}
    <div className="mt-10"><h2 className="text-xl font-black">Share this article</h2><div className="mt-4 flex justify-center gap-3" aria-label="Share this article"><a className="grid size-10 place-items-center rounded-full bg-[#00524f] text-sm font-black text-white no-underline" href="https://www.facebook.com/sharer/sharer.php">f</a><a className="grid size-10 place-items-center rounded-full bg-[#00524f] text-sm font-black text-white no-underline" href="https://www.linkedin.com/sharing/share-offsite/">in</a><a className="grid size-10 place-items-center rounded-full bg-[#00524f] text-sm font-black text-white no-underline" href="mailto:">@</a></div></div>
  </section>;
}

function SkooveArticleVideo({ block }: { block: any }) {
  const embedUrl = skooveVimeoEmbedUrl(block.content);
  const title = String(block.content?.title || block.content?.provider || "Skoove video").trim();
  const caption = typeof block.content?.caption === "string" ? block.content.caption.trim() : "";

  return <section id={block.id} className="w-full min-w-0 py-4 text-[#103133]">
    <figure className="m-0 w-full">
      <div className="relative aspect-video overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      {caption && <figcaption className="mt-3 text-sm leading-6 text-[#467071]">{caption}</figcaption>}
    </figure>
  </section>;
}

function SkooveCard({ entry, graph, collection, priority = false }: { entry: any; graph: any; collection?: any; priority?: boolean }) {
  const owner = collection ?? graph.collectionDefinitions.find((definition: any) => definition.id === entry.collectionId);
  const image = entryImage(entry);
  const categories = (entry.categoryIds ?? []).map((id: string) => graph.categories.find((category: any) => category.id === id)).filter(Boolean);
  return <article className="min-w-0 bg-white text-[#103133]">
    <a className="block text-inherit no-underline" href={getEntryPath(entry, owner, graph)}>
      {image && <figure className="relative m-0 aspect-[1.214/1] overflow-hidden bg-[#dfe8e8]"><PublicImage className="object-cover transition duration-300 hover:scale-[1.02]" src={image} alt={entry.fields?.featuredImageAlt || entry.title} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} /></figure>}
      <div className="px-5 py-3"><h2 className="m-0 min-h-[2.9rem] text-lg font-bold leading-[1.3]">{entry.title}</h2><p className="mt-2 text-xs font-bold text-[#467071]">{categories[0]?.name || owner?.singularName || "Magazine"}{entry.publishedAt ? ` · ${new Date(entry.publishedAt).toLocaleDateString(getContentLocale(entry, graph.site), { month: "short", day: "numeric", year: "numeric" })}` : ""}</p></div>
    </a>
  </article>;
}

function MagazineCardsPage({ route }: { route: any }) {
  const blocks = route.subject.blocks ?? [];
  const cards = blocks.flatMap((block: any, index: number) => {
    if (block.type !== "IMAGE_GALLERY") return [];
    const next = blocks[index + 1];
    const image = block.content?.images?.[0];
    const source = typeof image === "string" ? image : image?.src;
    const title = next?.type === "TEXT" ? nodeText(next.content?.nodes).trim() : "";
    const linkedHref = next?.type === "TEXT" ? nodeLink(next.content?.nodes) : "";
    const matchingEntry = (route.graph.entries ?? []).find((entry: any) => String(entry.title).trim().toLowerCase() === title.toLowerCase());
    const owner = matchingEntry ? route.graph.collectionDefinitions.find((definition: any) => definition.id === matchingEntry.collectionId) : null;
    const href = linkedHref || (matchingEntry ? getEntryPath(matchingEntry, owner, route.graph) : "");
    return source && title ? [{ source, alt: typeof image === "string" ? title : image?.alt || title, title, href }] : [];
  });

  return <section className="w-full bg-[#f5f5f5] px-5 pb-8 pt-12 sm:px-8">
    <div className="mx-auto w-full max-w-[69rem]"><h1 className="mb-10 text-[1.5625rem] font-bold leading-tight">{route.subject.title || "Articles"}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map((card: any, index: number) => <article className="bg-white" key={`${card.source}-${index}`}><a className="block text-[#103133] no-underline" href={card.href || "#"}><figure className="relative m-0 aspect-[1.214/1] overflow-hidden"><PublicImage className="object-cover" src={card.source} alt={card.alt} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" loading={index < 3 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} /></figure><h2 className="m-0 px-5 py-4 text-lg font-bold leading-[1.3]">{card.title}</h2></a></article>)}</div>
    </div>
  </section>;
}

function LandingPage({ route }: { route: any }) {
  if (route.path?.replace(/\/+$/, "")?.endsWith("/articles")) return <MagazineCardsPage route={route} />;
  return <div className="template-page">{(route.subject.blocks ?? []).map((block: any, index: number) => <BlockRenderer key={block.id} block={block} graph={route.graph} subject={route.subject} page={route.page} path={route.path} priority={index < 3} />)}</div>;
}

function Article({ route }: { route: any }) {
  const { graph, subject: entry, collection } = route;
  const fields = entry.fields ?? {};
  const locale = getContentLocale(entry, graph.site);
  const homePath = getSkooveHomePath(locale);
  const categories = (entry.categoryIds ?? []).map((id: string) => graph.categories.find((category: any) => category.id === id)).filter(Boolean);
  const related = getPublishedEntries(graph, locale).filter((candidate: any) => candidate.id !== entry.id && candidate.collectionId === entry.collectionId).filter((candidate: any) => !entry.categoryIds?.length || candidate.categoryIds?.some((id: string) => entry.categoryIds.includes(id))).slice(0, 3);
  const image = entryImage(entry);
  const richBody = !entry.blocks?.length && fields.body?.type === "doc" ? fields.body : null;
  const textBody = !entry.blocks?.length && typeof fields.body === "string" ? fields.body : !entry.blocks?.length && typeof fields.content === "string" ? fields.content : "";
  const blocks = entry.blocks ?? [];
  const faqSection = findFaqSection(blocks);
  const authorSection = findAuthorSection(blocks);

  const renderedBlocks = blocks.map((block: any, index: number) => {
    if (faqSection && index === faqSection.start) return <FaqAccordion items={faqSection.items} graph={graph} entry={entry} key="skoove-faq" />;
    if (faqSection && index > faqSection.start && index < faqSection.end) return null;
    if (authorSection && index === authorSection.start) return <AuthorSection section={authorSection} key="skoove-author" />;
    if (authorSection && index > authorSection.start && index < authorSection.end) return null;
    if (block.type === "VIDEO_EMBED" && skooveVimeoEmbedUrl(block.content)) return <SkooveArticleVideo block={block} key={block.id} />;
    return <BlockRenderer key={block.id} block={block} graph={graph} subject={entry} />;
  });

  return <article className="min-w-0 bg-white px-5 pb-16 pt-7 text-[#103133] sm:px-8">
    <div className="mx-auto w-full max-w-[80rem]">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-lg text-[#649492]" aria-label="Breadcrumb"><a className="font-bold text-[#2ec39f] no-underline hover:underline" href={homePath}>Magazine</a>{categories[0] && <><span>›</span><a className="font-bold text-[#2ec39f] no-underline hover:underline" href={getCategoryPath(categories[0], graph)}>{categories[0].name}</a></>}<span>›</span><span className="min-w-0 truncate">{entry.title}</span></nav>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(15.5rem,1fr)]">
        <div className="min-w-0">
          <header><h1 className="m-0 max-w-[55rem] text-[clamp(2rem,4vw,2.3125rem)] font-black leading-[1.2] tracking-[-0.015em]">{entry.title}</h1></header>
          {image && <figure className="relative mb-7 mt-5 aspect-[1.755/1] overflow-hidden bg-[#dfe8e8]"><PublicImage className="object-cover" src={normalizedSkooveAsset(image)} alt={fields.featuredImageAlt || fields.imageAlt || entry.title} fill sizes="(max-width: 1023px) 100vw, 930px" loading="eager" fetchPriority="high" style={{ objectPosition: fields.featuredImagePosition || fields.imagePosition || "center" }} /></figure>}
          <div className="skoove-article-content min-w-0 text-lg leading-[1.5] [&_h2]:!mb-3 [&_h2]:!mt-8 [&_h2]:!text-[1.75rem] [&_h2]:!leading-[1.35] [&_h3]:!mt-7 [&_h3]:!text-2xl [&_h3]:!leading-[1.35] [&_p]:!my-4 [&_p]:!text-lg [&_p]:!leading-[1.5] [&_section]:!py-2 [&_section>div]:!max-w-none">
            {richBody && <StructuredTextRenderer nodes={richBody} />}
            {textBody && textBody.split(/\n{2,}/).map((paragraph: string, index: number) => <p className="my-4" key={index}>{paragraph}</p>)}
            {renderedBlocks}
          </div>
          {(entry.publishedAt || entry.updatedAt) && <div className="mt-10 flex flex-wrap gap-x-5 gap-y-1 border-t border-[#c7cdcd] pt-4 text-sm text-[#467071]">{entry.publishedAt && <time dateTime={entry.publishedAt}>Created on {new Date(entry.publishedAt).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" })}</time>}{entry.updatedAt && <span>Updated on {new Date(entry.updatedAt).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" })}</span>}</div>}
        </div>
        <ArticleSidebar locale={locale} />
      </div>
    </div>
    {related.length > 0 && <section className="mx-auto mt-16 w-full max-w-[69rem] border-t border-[#ccd9d9] pt-8"><h2 className="mb-5 text-2xl font-bold">More from the magazine</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{related.map((item: any, index: number) => <SkooveCard entry={item} graph={graph} collection={collection} priority={index === 0} key={item.id} />)}</div></section>}
  </article>;
}

function CollectionIndex({ route }: { route: any }) {
  const { graph, subject: collection } = route;
  const entries = getCollectionEntries(collection, graph);
  return <section className="w-full bg-[#f5f5f5] px-5 py-8 sm:px-8"><div className="mx-auto w-full max-w-[69rem]"><h1 className="mb-5 text-[1.5625rem] font-bold leading-tight">{collection.name}</h1>{collection.description && <p className="mb-7 max-w-3xl text-base leading-7 text-[#467071]">{collection.description}</p>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{entries.map((entry: any, index: number) => <SkooveCard entry={entry} graph={graph} collection={collection} priority={index === 0} key={entry.id} />)}</div></div></section>;
}

function CategoryIndex({ route }: { route: any }) {
  const { graph, subject: category } = route;
  const locale = getContentLocale(category, graph.site);
  const homePath = getSkooveHomePath(locale);
  const entries = getCategoryEntries(category, graph).sort((a: any, b: any) => String(b.publishedAt || b.updatedAt).localeCompare(String(a.publishedAt || a.updatedAt)));
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const current = Math.min(Math.max(1, Number(route.page) || 1), pageCount);
  const visible = entries.slice((current - 1) * pageSize, current * pageSize);
  const categoryPath = getCategoryPath(category, graph);
  const pageHref = (page: number) => page === 1 ? categoryPath : `${categoryPath}page/${page}/`;
  return <section className="w-full bg-[#f5f5f5] px-5 py-8 sm:px-8"><div className="mx-auto w-full max-w-[69rem]"><nav className="mb-5 flex items-center gap-2 text-xs font-bold text-[#467071]" aria-label="Breadcrumb"><a className="text-inherit no-underline hover:underline" href={homePath}>Magazine</a><span>›</span><span>{category.name}</span></nav><h1 className="mb-5 text-[1.5625rem] font-bold leading-tight">{category.name}</h1>{category.description && !/^Browse content filed under/i.test(category.description) && <p className="mb-7 max-w-3xl text-base leading-7 text-[#467071]">{category.description}</p>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((entry: any, index: number) => <SkooveCard entry={entry} graph={graph} priority={index === 0} key={entry.id} />)}</div>{pageCount > 1 && <nav className="mt-10 flex items-center justify-between border-t border-[#ccd9d9] pt-6 text-sm font-bold" aria-label="Archive pagination">{current > 1 ? <a className="border border-[#00524f] px-4 py-2 text-[#00524f] no-underline" href={pageHref(current - 1)}>← Previous</a> : <span />}<span>{current} / {pageCount}</span>{current < pageCount ? <a className="bg-[#00524f] px-4 py-2 text-white no-underline" href={pageHref(current + 1)}>Next →</a> : <span />}</nav>}</div></section>;
}

export function SkooveTemplateRenderer({ route }: { route: any }) {
  if (route.routeType === "entry") return <Article route={route} />;
  if (route.routeType === "collection") return <CollectionIndex route={route} />;
  if (route.routeType === "category") return <CategoryIndex route={route} />;
  return <LandingPage route={route} />;
}
