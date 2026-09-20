import type { ReactNode } from "react";
import { cx, publicStyles as ui } from "../../styles/publicStyles";

type RichTextNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: RichTextNode[];
};

const sanitizeHref = (value: unknown) => {
  if (typeof value !== "string") return "#";

  const href = value.trim();
  if (href.startsWith("/") || href.startsWith("#")) return href;

  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return url.href;
    }
  } catch {
    return "#";
  }

  return "#";
};

const renderMarkedText = (node: RichTextNode) => {
  let text: ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") text = <strong>{text}</strong>;
    if (mark.type === "italic") text = <em>{text}</em>;
    if (mark.type === "underline") text = <u>{text}</u>;
    if (mark.type === "strike") text = <s>{text}</s>;
    if (mark.type === "code") text = <code>{text}</code>;
    if (mark.type === "subscript") text = <sub>{text}</sub>;
    if (mark.type === "superscript") text = <sup>{text}</sup>;
    if (mark.type === "link") {
      text = (
        <a href={sanitizeHref(mark.attrs?.href)} rel="noreferrer" className="font-semibold text-[var(--site-primary)] underline decoration-[color-mix(in_srgb,var(--site-primary)_35%,transparent)] underline-offset-4 hover:decoration-current">
          {text}
        </a>
      );
    }
  }

  return text;
};

const renderChildren = (node: RichTextNode) =>
  (node.content ?? []).map((child, index) => (
    <TiptapNodeRenderer key={index} node={child} />
  ));

const plainText = (node: RichTextNode): string =>
  node.type === "text" ? node.text ?? "" : (node.content ?? []).map(plainText).join("");

const headingId = (node: RichTextNode) =>
  plainText(node)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

const textAlignStyle = (node: RichTextNode) => {
  const textAlign = node.attrs?.textAlign;
  return ["left", "center", "right", "justify"].includes(String(textAlign))
    ? { textAlign: textAlign as "left" | "center" | "right" | "justify" }
    : undefined;
};

const TiptapNodeRenderer = ({ node }: { node: RichTextNode }) => {
  switch (node.type) {
    case "doc":
      return <>{renderChildren(node)}</>;
    case "text":
      return <>{renderMarkedText(node)}</>;
    case "paragraph":
      return <p style={textAlignStyle(node)}>{renderChildren(node)}</p>;
    case "heading": {
      const rawLevel = Number(node.attrs?.level ?? 2);
      const level = Math.min(6, Math.max(1, Number.isFinite(rawLevel) ? rawLevel : 2));
      const classes = [
        "",
        "mt-12 scroll-mt-28 font-[var(--font-heading)] text-4xl font-extrabold leading-tight tracking-tight text-[var(--site-heading)] sm:text-5xl",
        "mt-12 scroll-mt-28 font-[var(--font-heading)] text-3xl font-extrabold leading-tight tracking-tight text-[var(--site-heading)] sm:text-4xl",
        "mt-10 scroll-mt-28 font-[var(--font-heading)] text-2xl font-extrabold leading-tight tracking-tight text-[var(--site-heading)] sm:text-3xl",
        "mt-8 scroll-mt-28 font-[var(--font-heading)] text-xl font-extrabold leading-tight text-[var(--site-heading)] sm:text-2xl",
        "mt-7 scroll-mt-28 font-[var(--font-heading)] text-lg font-extrabold text-[var(--site-heading)] sm:text-xl",
        "mt-6 scroll-mt-28 font-[var(--font-heading)] text-base font-extrabold uppercase tracking-wide text-[var(--site-heading)]",
      ];
      const Tag = `h${level}` as any;
      return <Tag id={headingId(node) || undefined} className={classes[level]} style={textAlignStyle(node)}>{renderChildren(node)}</Tag>;
    }
    case "bulletList":
      return <ul className="my-6 ml-6 list-disc space-y-2 marker:text-[var(--site-primary)]">{renderChildren(node)}</ul>;
    case "orderedList":
      return <ol className="my-6 ml-6 list-decimal space-y-2 marker:font-bold marker:text-[var(--site-primary)]">{renderChildren(node)}</ol>;
    case "listItem":
      return <li>{renderChildren(node)}</li>;
    case "blockquote":
      return <blockquote className="my-8 border-l-4 border-[var(--site-accent)] pl-6 font-[var(--font-heading)] text-xl italic leading-relaxed text-[var(--site-heading)]">{renderChildren(node)}</blockquote>;
    case "horizontalRule":
      return <hr className="my-10 border-0 border-t border-[var(--site-border)]" />;
    case "hardBreak":
      return <br />;
    case "codeBlock":
      return <pre className="my-8 overflow-x-auto rounded-[var(--site-radius-sm)] bg-[var(--site-inverse)] p-5 text-sm text-[var(--site-on-inverse)]"><code>{node.text ?? renderChildren(node)}</code></pre>;
    default:
      return <>{renderChildren(node)}</>;
  }
};

export const StructuredTextRenderer = ({ nodes }: { nodes: RichTextNode }) => {
  if (!nodes || nodes.type !== "doc") return null;

  return (
    <div className="[&_p]:my-5 [&_p]:text-[1.0625rem] [&_p]:leading-8 [&_p]:text-[var(--site-text)] [&_strong]:font-extrabold [&_code]:rounded [&_code]:bg-[var(--site-surface-soft)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]">
      <TiptapNodeRenderer node={nodes} />
    </div>
  );
};

export function TextView({ content }: { content: any }) {
  const presentation = ["theme", "standard", "lead", "compact"].includes(content.presentation)
    ? content.presentation
    : "theme";

  if (content.variant === "article") {
    return (
      <section className="w-full min-w-0 py-4 text-[var(--site-text)]">
        <div className="mx-auto w-full max-w-[58.125rem]">
          {content.title && (
            <h2 className="mb-8 font-[var(--font-heading)] text-3xl font-extrabold tracking-tight text-[var(--site-heading)] sm:text-4xl">{content.title}</h2>
          )}
          <StructuredTextRenderer nodes={content.nodes} />
        </div>
      </section>
    );
  }

  return (
    <section id="content" className={presentation === "compact" ? ui.sectionCompact : ui.section} data-presentation={presentation}>
      <div className={cx(
        ui.container,
        presentation === "lead" ? "max-w-[68rem] [&_p]:text-xl [&_p]:leading-9" : "max-w-[48rem]",
      )}>
        {content.title && (
          <h2 className="mb-8 font-[var(--font-heading)] text-3xl font-extrabold tracking-tight text-[var(--site-heading)] sm:text-4xl">{content.title}</h2>
        )}
        <StructuredTextRenderer nodes={content.nodes} />
      </div>
    </section>
  );
}
