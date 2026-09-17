const normalizePublicImagePath = (src = "") =>
  src.startsWith("public/") ? src.replace(/^public/, "") : src;

const renderInlineMarkdown = (text: string) =>
  text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });

const renderContent = (content = "") =>
  content.split(/\n{2,}/).map((paragraph, index) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return null;
    const imageMatch = trimmed.match(/^!\[(.*?)\]\((\S+)(?:\s+"[^"]*")?\)$/);

    if (trimmed.startsWith("## ")) {
      return <h3 key={index} className="mt-6 text-2xl font-extrabold text-[var(--site-heading)]">{renderInlineMarkdown(trimmed.replace(/^##\s+/, ""))}</h3>;
    }

    if (imageMatch) {
      return (
        <img
          key={index}
          src={normalizePublicImagePath(imageMatch[2])}
          alt={imageMatch[1]}
          className="my-5 h-auto w-full rounded-lg shadow-sm"
          loading="lazy"
          decoding="async"
        />
      );
    }

    if (trimmed.split("\n").every((line) => /^\d+\.\s+/.test(line.trim()))) {
      return (
        <ol key={index} className="mb-4 list-decimal space-y-1 pl-5">
          {trimmed.split("\n").map((line, lineIndex) => (
            <li key={lineIndex}>{renderInlineMarkdown(line.trim().replace(/^\d+\.\s+/, ""))}</li>
          ))}
        </ol>
      );
    }

    if (trimmed.split("\n").every((line) => /^[-*]\s+/.test(line.trim()))) {
      return (
        <ul key={index} className="mb-4 list-disc space-y-1 pl-5">
          {trimmed.split("\n").map((line, lineIndex) => (
            <li key={lineIndex}>{renderInlineMarkdown(line.trim().replace(/^[-*]\s+/, ""))}</li>
          ))}
        </ul>
      );
    }

    return <p key={index} className="mb-4 whitespace-pre-line">{renderInlineMarkdown(trimmed)}</p>;
  });

export function RentalImageTextView({ content }: { content: any }) {
  const imageLeft = content.imageLeft ?? true;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-8 py-24 md:flex-row">
      <div className={`flex flex-col items-center rounded-[var(--site-radius)] bg-[var(--site-surface)] p-6 text-[var(--site-text)] md:flex-row ${imageLeft ? "md:flex-row-reverse" : ""}`}>
        <div className="w-full p-4 md:w-1/2">
          <img
            src={normalizePublicImagePath(content.imageSrc || "/city-rent/background.jpeg")}
            alt={content.title || ""}
            className="h-auto w-full shadow-md"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="w-full p-4 text-center md:w-1/2 md:text-left">
          <span className="mb-4 inline-block font-semibold text-[var(--site-primary)]">{content.eyebrow}</span>
          <h2 className="mb-8 text-3xl font-extrabold text-[var(--site-heading)] sm:text-4xl">{content.title}</h2>
          <div className="leading-relaxed text-gray-600">{renderContent(content.content || "")}</div>
        </div>
      </div>
    </div>
  );
}
