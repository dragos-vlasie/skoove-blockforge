import { createHash } from "node:crypto";
import type { Element, Nodes, Parent, Root, RootContent, Text } from "hast";
import { defaultSchema, sanitize } from "hast-util-sanitize";
import { select, selectAll } from "hast-util-select";
import { toHtml } from "hast-util-to-html";
import { toText } from "hast-util-to-text";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import type {
  LinkedMedia,
  MigrationBlock,
  MigrationIssue,
  MigrationLink,
  MigrationSource,
  ParsedWordPressHtml,
  RichTextMark,
  RichTextNode,
} from "./types";

type ParseContext = {
  source: MigrationSource;
  siteHostname: string;
  blockCounter: number;
  linkedMedia: LinkedMedia[];
  links: MigrationLink[];
  issues: MigrationIssue[];
  fallbackFragments: number;
};

const parser = unified().use(rehypeParse, { fragment: true });

const element = (node: Nodes | undefined | null): node is Element => node?.type === "element";
const textNode = (node: Nodes | undefined | null): node is Text => node?.type === "text";
const childrenOf = (node: Nodes | undefined | null): RootContent[] =>
  node && "children" in node && Array.isArray(node.children) ? (node.children as RootContent[]) : [];

const propertyString = (node: Element, ...keys: string[]) => {
  for (const key of keys) {
    const value = node.properties?.[key];
    if (Array.isArray(value)) return value.join(" ");
    if (value !== undefined && value !== null) return String(value);
  }
  return "";
};

const classesOf = (node: Element) => {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  return typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [];
};

const hasClass = (node: Element, className: string) => classesOf(node).includes(className);

const alignmentFor = (node: Element) => {
  const classAlignment = classesOf(node)
    .map((className) => className.match(/^has-text-align-(left|center|right|justify)$/)?.[1])
    .find(Boolean);
  if (classAlignment) return classAlignment;
  const styleAlignment = propertyString(node, "style").match(/text-align\s*:\s*(left|center|right|justify)/i)?.[1];
  return styleAlignment?.toLowerCase();
};

const normalizedText = (node: Nodes | undefined | null) =>
  node ? toText(node as any, { whitespace: "normal" }).replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim() : "";

const safeSourceHtml = (node: Nodes) => {
  const root: Root = { type: "root", children: [node as RootContent] };
  const schema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      "*": [
        ...(defaultSchema.attributes?.["*"] ?? []),
        "className",
        "id",
        ["data*", /.*/],
        "style",
      ],
      iframe: ["src", "title", "width", "height", "allow", "allowFullScreen", "loading"],
    },
    tagNames: [...(defaultSchema.tagNames ?? []), "iframe", "figure", "figcaption"],
  };
  return toHtml(sanitize(root, schema as any));
};

const mark = (type: RichTextMark["type"], attrs?: Record<string, unknown>): RichTextMark => ({
  type,
  ...(attrs ? { attrs } : {}),
});

const appendUniqueMark = (marks: RichTextMark[], next: RichTextMark) =>
  marks.some((candidate) => candidate.type === next.type && JSON.stringify(candidate.attrs) === JSON.stringify(next.attrs))
    ? marks
    : [...marks, next];

const hrefFor = (node: Nodes | undefined | null) => (element(node) ? propertyString(node, "href") : "");

function inlineNodes(node: Nodes, marks: RichTextMark[] = []): RichTextNode[] {
  if (textNode(node)) {
    if (!node.value) return [];
    return [{ type: "text", text: node.value.replace(/\u00a0/g, " "), ...(marks.length ? { marks } : {}) }];
  }

  if (!element(node)) return childrenOf(node).flatMap((child) => inlineNodes(child, marks));
  if (node.tagName === "br") return [{ type: "hardBreak" }];
  if (node.tagName === "img") return [];

  let nextMarks = marks;
  if (["strong", "b"].includes(node.tagName)) nextMarks = appendUniqueMark(nextMarks, mark("bold"));
  if (["em", "i"].includes(node.tagName)) nextMarks = appendUniqueMark(nextMarks, mark("italic"));
  if (["s", "del", "strike"].includes(node.tagName)) nextMarks = appendUniqueMark(nextMarks, mark("strike"));
  if (node.tagName === "code") nextMarks = appendUniqueMark(nextMarks, mark("code"));
  if (node.tagName === "u") nextMarks = appendUniqueMark(nextMarks, mark("underline"));
  if (node.tagName === "sub") nextMarks = appendUniqueMark(nextMarks, mark("subscript"));
  if (node.tagName === "sup") nextMarks = appendUniqueMark(nextMarks, mark("superscript"));
  if (node.tagName === "a" && hrefFor(node)) {
    nextMarks = appendUniqueMark(nextMarks, mark("link", { href: hrefFor(node) }));
  }

  return childrenOf(node).flatMap((child) => inlineNodes(child, nextMarks));
}

const richParagraph = (node: Element): RichTextNode | null => {
  const content = childrenOf(node).flatMap((child) => inlineNodes(child));
  const textAlign = alignmentFor(node);
  return content.length ? { type: "paragraph", ...(textAlign ? { attrs: { textAlign } } : {}), content } : null;
};

const richListItem = (node: Element): RichTextNode => {
  const content: RichTextNode[] = [];
  const looseInline: RichTextNode[] = [];

  for (const child of childrenOf(node)) {
    if (element(child) && ["ul", "ol"].includes(child.tagName)) {
      if (looseInline.length) {
        content.push({ type: "paragraph", content: looseInline.splice(0) });
      }
      content.push(richList(child));
    } else if (element(child) && child.tagName === "p") {
      const paragraph = richParagraph(child);
      if (paragraph) content.push(paragraph);
    } else {
      looseInline.push(...inlineNodes(child));
    }
  }

  if (looseInline.length) content.unshift({ type: "paragraph", content: looseInline });
  if (!content.length) content.push({ type: "paragraph" });
  return { type: "listItem", content };
};

const richList = (node: Element): RichTextNode => ({
  type: node.tagName === "ol" ? "orderedList" : "bulletList",
  content: childrenOf(node)
    .filter((child): child is Element => element(child) && child.tagName === "li")
    .map(richListItem),
});

const richNodeForBlockElement = (node: Element): RichTextNode[] => {
  if (node.tagName === "p") {
    const paragraph = richParagraph(node);
    return paragraph ? [paragraph] : [];
  }
  if (/^h[1-6]$/.test(node.tagName)) {
    const content = childrenOf(node).flatMap((child) => inlineNodes(child));
    return content.length
      ? [{
          type: "heading",
          attrs: {
            level: Number(node.tagName.slice(1)),
            ...(alignmentFor(node) ? { textAlign: alignmentFor(node) } : {}),
          },
          content,
        }]
      : [];
  }
  if (node.tagName === "ul" || node.tagName === "ol") return [richList(node)];
  if (node.tagName === "blockquote") {
    const content = childrenOf(node)
      .filter((child): child is Element => element(child))
      .flatMap((child) => richNodeForBlockElement(child));
    return content.length ? [{ type: "blockquote", content }] : [];
  }
  if (node.tagName === "hr") return [{ type: "horizontalRule" }];
  if (node.tagName === "pre") {
    const value = normalizedText(node);
    return value ? [{ type: "codeBlock", content: [{ type: "text", text: value }] }] : [];
  }
  return [];
};

const isRichBlockElement = (node: Nodes) =>
  element(node) && (/^h[1-6]$/.test(node.tagName) || ["p", "ul", "ol", "blockquote", "hr", "pre"].includes(node.tagName));

const isDataImage = (src: string) => src.startsWith("data:image/");

const mediaForImage = (node: Element, caption: string, sourceElement: string): LinkedMedia | null => {
  const src = propertyString(node, "dataLayzr", "dataSrc", "dataLargeFile", "dataOrigFile", "src");
  if (!src || isDataImage(src)) return null;
  const classes = classesOf(node);
  const attachmentClass = classes.find((className) => /^wp-image-\d+$/.test(className));
  const attachmentId = Number(
    propertyString(node, "dataAttachmentId") || attachmentClass?.replace("wp-image-", "") || 0,
  );
  const width = Number(propertyString(node, "width") || 0);
  const height = Number(propertyString(node, "height") || 0);

  return {
    sourceUrl: src,
    alt: propertyString(node, "alt") || caption,
    ...(caption ? { caption } : {}),
    ...(width > 0 ? { width } : {}),
    ...(height > 0 ? { height } : {}),
    ...(attachmentId > 0 ? { sourceAttachmentId: attachmentId } : {}),
    sourceElement,
  };
};

const captionFor = (node: Element) => normalizedText(select("figcaption", node) as Nodes | null);

const tableContent = (node: Element) => {
  const caption = normalizedText(select("caption", node) as Nodes | null);
  const rows = selectAll("tr", node)
    .map((row) => {
      const headerCells = selectAll("th", row).map((cell) => normalizedText(cell));
      const dataCells = selectAll("td", row).map((cell) => normalizedText(cell));
      return { headerCells, dataCells, cells: headerCells.length ? headerCells : dataCells };
    })
    .filter((row) => row.cells.length);

  const first = rows[0];
  const headers = first?.headerCells.length ? first.cells : [];
  const body = (headers.length ? rows.slice(1) : rows).map((row) => ({ cells: row.cells }));
  return {
    presentation: "theme",
    variant: "article",
    caption,
    headers,
    rows: body,
    headersText: headers.join(" | "),
    rowsText: body.map((row) => row.cells.join(" | ")).join("\n"),
  };
};

const providerFor = (src: string) => {
  try {
    const hostname = new URL(src).hostname.toLowerCase();
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
    if (hostname.includes("vimeo.com")) return "vimeo";
    if (hostname.includes("videopress.com")) return "videopress";
    return hostname.replace(/^www\./, "");
  } catch {
    return "iframe";
  }
};

const ratioFor = (node: Element) => {
  const width = Number(propertyString(node, "width") || 0);
  const height = Number(propertyString(node, "height") || 0);
  if (!width || !height) return "16:9";
  return `${width}:${height}`;
};

const blockId = (context: ParseContext, type: string, sourceElement: string) => {
  context.blockCounter += 1;
  const digest = createHash("sha1")
    .update(`${context.source.entityKind}:${context.source.entityId}:${context.blockCounter}:${type}:${sourceElement}`)
    .digest("hex")
    .slice(0, 10);
  return `wp-${context.source.entityKind}-${context.source.entityId}-${type.toLowerCase()}-${digest}`;
};

const migrationBlock = (
  context: ParseContext,
  type: string,
  content: Record<string, unknown>,
  node: Element,
): MigrationBlock => ({
  id: blockId(context, type, node.tagName),
  type,
  content,
  migration: {
    source: context.source,
    sourceElement: node.tagName,
    ...(classesOf(node).length ? { sourceClasses: classesOf(node) } : {}),
    ...(propertyString(node, "style") ? { sourceInlineStyle: propertyString(node, "style") } : {}),
  },
});

const issue = (context: ParseContext, value: MigrationIssue) => {
  context.issues.push(value);
  if (value.sourceHtml) context.fallbackFragments += 1;
};

const mapFigure = (node: Element, context: ParseContext): MigrationBlock[] => {
  const table = select("table", node);
  if (element(table)) return [migrationBlock(context, "TABLE", tableContent(table), node)];

  const iframe = select("iframe", node);
  if (element(iframe)) return mapIframe(iframe, context, captionFor(node));

  const instagramUrl = instagramUrlFor(node);
  if (instagramUrl) {
    return [
      migrationBlock(
        context,
        "VIDEO_EMBED",
        {
          presentation: "minimal",
          variant: "article",
          title: "Instagram post",
          embedUrl: instagramUrl,
          provider: "instagram",
          caption: captionFor(node),
          aspectRatio: "4:5",
        },
        node,
      ),
    ];
  }

  const caption = captionFor(node);
  const media = selectAll("img", node)
    .map((image) => mediaForImage(image, caption, "figure"))
    .filter((candidate): candidate is LinkedMedia => Boolean(candidate));

  if (media.length) {
    context.linkedMedia.push(...media);
    return [
      migrationBlock(
        context,
        "IMAGE_GALLERY",
        {
          presentation: media.length > 1 ? "theme" : "minimal",
          variant: "article",
          title: caption,
          images: media.map((image) => ({ src: image.sourceUrl, alt: image.alt, caption: image.caption ?? "" })),
        },
        node,
      ),
    ];
  }

  const embedUrl = hrefFor(select("a", node));
  if (embedUrl && hasClass(node, "wp-block-embed")) {
    issue(context, {
      code: "embed.requires-provider-mapping",
      severity: "warning",
      message: `Embed requires a provider-specific component: ${embedUrl}`,
      sourceElement: node.tagName,
      sourceClasses: classesOf(node),
      sourceHtml: safeSourceHtml(node),
    });
    return [];
  }

  issue(context, {
    code: "figure.unmapped",
    severity: "warning",
    message: "Figure did not contain an importable image, table, or iframe.",
    sourceElement: node.tagName,
    sourceClasses: classesOf(node),
    sourceHtml: safeSourceHtml(node),
  });
  return [];
};

const mapIframe = (node: Element, context: ParseContext, caption = ""): MigrationBlock[] => {
  const src = propertyString(node, "src", "dataSrc");
  if (!src) {
    issue(context, {
      code: "embed.missing-source",
      severity: "warning",
      message: "Iframe has no usable source URL.",
      sourceElement: node.tagName,
      sourceHtml: safeSourceHtml(node),
    });
    return [];
  }

  return [
    migrationBlock(
      context,
      "VIDEO_EMBED",
      {
        presentation: "theme",
        variant: "article",
        title: propertyString(node, "title") || "Embedded content",
        embedUrl: src,
        provider: providerFor(src),
        caption,
        aspectRatio: ratioFor(node),
      },
      node,
    ),
  ];
};

const mapNewsletterForm = (node: Element, context: ParseContext): MigrationBlock[] => {
  const email = select('input[type="email"]', node);
  const submit = select('input[type="submit"],button[type="submit"]', node);
  const action = propertyString(node, "action");
  const sourceText = normalizedText(node)
    .replace(/\bsubscribe\b\s*$/i, "")
    .trim();

  if (!element(email) && !/mailchimp|list-manage|mc_embed/i.test(`${action} ${classesOf(node).join(" ")} ${safeSourceHtml(node)}`)) {
    return [];
  }

  return [
    migrationBlock(
      context,
      "NEWSLETTER_SIGNUP",
      {
        presentation: "inline",
        eyebrow: "Stay informed",
        title: sourceText || "Get the next story in your inbox",
        subtitle: "",
        action,
        emailFieldName: element(email) ? propertyString(email, "name") || "EMAIL" : "EMAIL",
        emailLabel: "Email address",
        emailPlaceholder: element(email) ? propertyString(email, "placeholder") || "you@example.com" : "you@example.com",
        buttonText: element(submit) ? propertyString(submit, "value") || normalizedText(submit) || "Subscribe" : "Subscribe",
        privacyText: "You can unsubscribe at any time.",
      },
      node,
    ),
  ];
};

const instagramUrlFor = (node: Element) => {
  const quote = select("blockquote.instagram-media", node);
  const quoteSource = element(quote)
    ? propertyString(quote, "dataInstgrmPermalink", "data-instgrm-permalink") || hrefFor(select("a", quote))
    : "";
  const source = quoteSource || (classesOf(node).some((className) => className.includes("instagram")) ? hrefFor(select("a", node)) : "");
  if (!source) return "";
  try {
    const url = new URL(source);
    if (!url.hostname.includes("instagram.com")) return "";
    const match = url.pathname.match(/\/(?:p|reel|tv)\/[^/]+/);
    return match ? `https://www.instagram.com${match[0]}/embed/captioned/` : "";
  } catch {
    return "";
  }
};

const mapCover = (node: Element, context: ParseContext): MigrationBlock[] => {
  const image = select("img", node);
  const backgroundElement = select(".wp-block-cover__image-background", node);
  const backgroundStyle = element(backgroundElement) ? propertyString(backgroundElement, "style") : "";
  const backgroundUrl = backgroundStyle.match(/background-image\s*:\s*url\((['\"]?)(.*?)\1\)/i)?.[2] ?? "";
  const media = element(image) ? mediaForImage(image, "", "cover") : null;
  const imageUrl = media?.sourceUrl || backgroundUrl;
  const titleNode = select("h1,h2,h3,h4,h5,h6", node);
  const paragraph = select("p", node);
  const anchor = select("a", node);

  if (!imageUrl) return [];
  if (media) context.linkedMedia.push(media);

  return [
    migrationBlock(
      context,
      "IMAGE_TEXT",
      {
        layout: "image-top",
        eyebrow: "",
        title: normalizedText(titleNode as Nodes | null) || "Featured story",
        body: normalizedText(paragraph as Nodes | null),
        image: imageUrl,
        imageAlt: media?.alt || "",
        buttonText: normalizedText(anchor as Nodes | null),
        href: hrefFor(anchor),
        variant: "article-cover",
      },
      node,
    ),
  ];
};

const mapButtons = (node: Element, context: ParseContext): MigrationBlock[] => {
  const anchor = select("a", node);
  if (!element(anchor) || !hrefFor(anchor)) return [];
  return [
    migrationBlock(
      context,
      "CTA",
      {
        presentation: "minimal",
        title: normalizedText(anchor),
        buttonText: normalizedText(anchor),
        href: hrefFor(anchor),
      },
      node,
    ),
  ];
};

const mapColumns = (node: Element, context: ParseContext): MigrationBlock[] => {
  const columns = childrenOf(node).filter(
    (child): child is Element => element(child) && hasClass(child, "wp-block-column"),
  );
  if (!columns.length || columns.length > 4) return [];

  const columnBlocks = columns.map((column, index) => ({
    id: `column-${index + 1}`,
    label: `Column ${index + 1}`,
    blocks: mapNodes(childrenOf(column), context),
  }));

  const layout = columns.length === 3 ? "three-equal" : "split";
  return [
    migrationBlock(
      context,
      "TWO_COLUMN",
      { layout, gap: "lg", padding: "md", columns: columnBlocks },
      node,
    ),
  ];
};

const mapStandaloneImage = (node: Element, context: ParseContext): MigrationBlock[] => {
  const media = mediaForImage(node, "", node.tagName);
  if (!media) return [];
  context.linkedMedia.push(media);
  return [
    migrationBlock(
      context,
      "IMAGE_GALLERY",
      {
        presentation: "minimal",
        variant: "article",
        title: "",
        images: [{ src: media.sourceUrl, alt: media.alt }],
      },
      node,
    ),
  ];
};

const transparentContainers = new Set(["article", "main", "section", "div", "aside", "header", "footer"]);

function mapNodes(nodes: RootContent[], context: ParseContext): MigrationBlock[] {
  const blocks: MigrationBlock[] = [];
  let richNodes: RichTextNode[] = [];
  let richSource: Element | null = null;

  const flushRichText = () => {
    if (!richNodes.length || !richSource) return;
    blocks.push(
      migrationBlock(
        context,
        "TEXT",
        {
          presentation: "theme",
          variant: "article",
          title: "",
          nodes: { type: "doc", content: richNodes },
        },
        richSource,
      ),
    );
    richNodes = [];
    richSource = null;
  };

  for (const node of nodes) {
    if (textNode(node)) {
      if (!node.value.trim()) continue;
      richSource ??= { type: "element", tagName: "p", properties: {}, children: [] };
      richNodes.push({ type: "paragraph", content: inlineNodes(node) });
      continue;
    }
    if (!element(node)) continue;

    if (isRichBlockElement(node) && !select("img", node)) {
      richSource ??= node;
      richNodes.push(...richNodeForBlockElement(node));
      continue;
    }

    flushRichText();

    if (node.tagName === "figure") blocks.push(...mapFigure(node, context));
    else if (node.tagName === "img") blocks.push(...mapStandaloneImage(node, context));
    else if (node.tagName === "table") blocks.push(migrationBlock(context, "TABLE", tableContent(node), node));
    else if (node.tagName === "iframe") blocks.push(...mapIframe(node, context));
    else if (node.tagName === "form") {
      const mapped = mapNewsletterForm(node, context);
      if (mapped.length) blocks.push(...mapped);
      else {
        issue(context, {
          code: "component.form-unmapped",
          severity: "warning",
          message: "Form requires a dedicated editable CMS mapping.",
          sourceElement: node.tagName,
          sourceClasses: classesOf(node),
          sourceHtml: safeSourceHtml(node),
        });
      }
    } else if (hasClass(node, "wp-block-cover")) {
      const mapped = mapCover(node, context);
      if (mapped.length) blocks.push(...mapped);
      else {
        issue(context, {
          code: "component.cover-unmapped",
          severity: "warning",
          message: "Cover block has no usable image and requires review.",
          sourceElement: node.tagName,
          sourceClasses: classesOf(node),
          sourceHtml: safeSourceHtml(node),
        });
      }
    }
    else if (hasClass(node, "wp-block-buttons") || hasClass(node, "wp-block-button")) {
      blocks.push(...mapButtons(node, context));
    } else if (hasClass(node, "wp-block-columns")) {
      const mapped = mapColumns(node, context);
      if (mapped.length) blocks.push(...mapped);
      else {
        issue(context, {
          code: "layout.columns-unmapped",
          severity: "warning",
          message: "Column layout could not be represented safely.",
          sourceElement: node.tagName,
          sourceClasses: classesOf(node),
          sourceHtml: safeSourceHtml(node),
        });
      }
    } else if (["script", "style", "noscript"].includes(node.tagName)) {
      issue(context, {
        code: `html.${node.tagName}-removed`,
        severity: "info",
        message: `${node.tagName} content is not imported into editable page content.`,
        sourceElement: node.tagName,
      });
    } else if (["details", "canvas", "object"].includes(node.tagName)) {
      issue(context, {
        code: `component.${node.tagName}-unmapped`,
        severity: "warning",
        message: "Component requires a dedicated editable CMS mapping.",
        sourceElement: node.tagName,
        sourceClasses: classesOf(node),
        sourceHtml: safeSourceHtml(node),
      });
    } else if (transparentContainers.has(node.tagName)) {
      blocks.push(...mapNodes(childrenOf(node), context));
    } else {
      const nested = mapNodes(childrenOf(node), context);
      if (nested.length) blocks.push(...nested);
      else if (normalizedText(node)) {
        issue(context, {
          code: "html.element-unmapped",
          severity: "warning",
          message: `HTML element <${node.tagName}> contains content but has no editable mapping.`,
          sourceElement: node.tagName,
          sourceClasses: classesOf(node),
          sourceHtml: safeSourceHtml(node),
        });
      }
    }
  }

  flushRichText();
  return blocks;
}

const isAffiliateHref = (href: string) =>
  /(?:awin1\.com|amazon\.[^/]+\/(?:gp|dp)|impact\.com|booking\.com|partnerize|shareasale|clickbank|ref=|affiliate|affid=|tag=)/i.test(
    href,
  );

const collectLinks = (root: Root, siteHostname: string): MigrationLink[] =>
  selectAll("a", root)
    .map((anchor) => {
      const href = hrefFor(anchor);
      if (!href) return null;
      let internal = href.startsWith("/") || href.startsWith("#");
      try {
        internal ||= new URL(href).hostname === siteHostname;
      } catch {
        // Relative and fragment URLs were handled above.
      }
      return {
        href,
        text: normalizedText(anchor),
        internal,
        affiliate: isAffiliateHref(href),
      };
    })
    .filter((candidate): candidate is MigrationLink => Boolean(candidate));

const collectStyleInventory = (root: Root): ParsedWordPressHtml["styleInventory"] => {
  const classes: Record<string, number> = {};
  const alignments: Record<string, number> = {};
  const inlineStyles = new Set<string>();

  selectAll("*", root).forEach((node) => {
    classesOf(node).forEach((className) => {
      classes[className] = (classes[className] ?? 0) + 1;
    });
    const inlineStyle = propertyString(node, "style").trim();
    if (inlineStyle) inlineStyles.add(inlineStyle);
    const alignment = alignmentFor(node);
    if (alignment) alignments[alignment] = (alignments[alignment] ?? 0) + 1;
  });

  return {
    classes: Object.fromEntries(Object.entries(classes).sort((left, right) => right[1] - left[1])),
    inlineStyles: [...inlineStyles].sort(),
    alignments,
  };
};

export function parseWordPressHtml({
  html,
  source,
}: {
  html: string;
  source: MigrationSource;
}): ParsedWordPressHtml {
  const root = parser.parse(html) as Root;
  const siteHostname = new URL(source.siteUrl).hostname;
  const context: ParseContext = {
    source,
    siteHostname,
    blockCounter: 0,
    linkedMedia: [],
    links: collectLinks(root, siteHostname),
    issues: [],
    fallbackFragments: 0,
  };

  const blocks = mapNodes(root.children, context);
  const uniqueMedia = [...new Map(context.linkedMedia.map((media) => [`${media.sourceUrl}|${media.alt}`, media])).values()];

  return {
    blocks,
    linkedMedia: uniqueMedia,
    links: context.links,
    issues: context.issues,
    styleInventory: collectStyleInventory(root),
    stats: {
      headings: selectAll("h1,h2,h3,h4,h5,h6", root).length,
      paragraphs: selectAll("p", root).length,
      orderedLists: selectAll("ol", root).length,
      unorderedLists: selectAll("ul", root).length,
      blockquotes: selectAll("blockquote", root).length,
      images: uniqueMedia.length,
      galleries: selectAll("figure.wp-block-gallery,.wp-block-gallery", root).length,
      tables: selectAll("table", root).length,
      embeds: selectAll("iframe,.wp-block-embed", root).length,
      fallbackFragments: context.fallbackFragments,
    },
  };
}
