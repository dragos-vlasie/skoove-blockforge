const safeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const iframeSrcFromHtml = (value: string) => value.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] ?? "";

const youtubeEmbedUrl = (url: URL) => {
  if (url.hostname.includes("youtu.be")) {
    const id = url.pathname.replace(/^\/+/, "").split("/")[0];
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }

  const watchId = url.searchParams.get("v");
  if (watchId) return `https://www.youtube.com/embed/${watchId}`;

  const shortsMatch = url.pathname.match(/\/shorts\/([^/?#]+)/);
  if (shortsMatch?.[1]) return `https://www.youtube.com/embed/${shortsMatch[1]}`;

  const embedMatch = url.pathname.match(/\/embed\/([^/?#]+)/);
  if (embedMatch?.[1]) return `https://www.youtube.com/embed/${embedMatch[1]}`;

  return "";
};

const vimeoEmbedUrl = (url: URL) => {
  if (url.hostname.includes("player.vimeo.com")) return url.href;
  const id = url.pathname.match(/\/(\d+)/)?.[1];
  return id ? `https://player.vimeo.com/video/${id}` : "";
};

const instagramEmbedUrl = (url: URL) => {
  const match = url.pathname.match(/\/(?:p|reel|tv)\/[^/]+/);
  return match ? `https://www.instagram.com${match[0]}/embed/captioned/` : "";
};

const normalizeEmbedUrl = (value: unknown) => {
  const raw = safeText(value);
  if (!raw) return "";

  const source = raw.includes("<iframe") ? iframeSrcFromHtml(raw) : raw;
  if (!source) return "";

  try {
    const url = new URL(source);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";

    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      return youtubeEmbedUrl(url);
    }

    if (url.hostname.includes("vimeo.com")) {
      return vimeoEmbedUrl(url);
    }

    if (url.hostname.includes("instagram.com")) {
      return instagramEmbedUrl(url);
    }

    return url.href;
  } catch {
    return "";
  }
};

const aspectRatioValue = (value: unknown) => {
  const ratio = safeText(value) || "16:9";
  const [width, height] = ratio.split(":").map((part) => Number(part));
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return `${width} / ${height}`;
  }
  return "16 / 9";
};

const sectionClass = "w-full min-w-0 overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space-compact)] text-[var(--site-text)]";
const containerClass = "mx-auto w-full max-w-[var(--site-container-width)]";

export function VideoEmbedView({ content }: { content: any }) {
  const embedUrl = normalizeEmbedUrl(content.embedUrl || content.iframeHtml);
  const title = safeText(content.title) || safeText(content.provider) || "Embedded video";
  const caption = safeText(content.caption);
  const isArticle = content.variant === "article";
  const presentation = ["theme", "framed", "full-bleed", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";

  if (!embedUrl) {
    return (
      <section className={sectionClass} data-presentation={presentation} data-variant={isArticle ? "article" : "section"}>
        <div className={`${containerClass} rounded-[var(--site-card-radius)] border border-dashed border-[var(--site-border)] bg-[var(--site-surface-soft)] p-8 text-center font-semibold text-[var(--site-muted)]`}>
          Video embed is missing a valid iframe URL.
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClass} data-presentation={presentation} data-variant={isArticle ? "article" : "section"}>
      <figure className={`${containerClass} m-0`}>
        {content.title && !isArticle && (
          <h2 className="mb-8 max-w-4xl font-[var(--font-heading)] text-[clamp(2rem,4vw,4rem)] font-[var(--site-heading-weight)] leading-[var(--site-heading-line-height)] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{content.title}</h2>
        )}
        <div
          className={`${presentation === "full-bleed" ? "rounded-none" : "rounded-[var(--site-media-radius)]"} relative overflow-hidden bg-black shadow-[var(--site-media-shadow)]`}
          style={{ aspectRatio: aspectRatioValue(content.aspectRatio) }}
        >
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
        {caption && <figcaption className="mt-3 text-sm leading-6 text-[var(--site-muted)]">{caption}</figcaption>}
      </figure>
    </section>
  );
}
