/** Shared editor/public URL policy. Never store executable or ambiguous schemes. */
export function normalizeLinkHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f]/.test(href) || href.includes("\\")) return null;
  if ((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#")) return href;
  try {
    // Preserve legacy protocol-relative links safely and encode spaces in URLs.
    const url = new URL(href.startsWith("//") ? `https:${href}` : href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
