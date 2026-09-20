import { cx, publicStyles as ui } from "../../styles/publicStyles";

const safeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const splitCells = (line: string) =>
  line
    .split(/\s*\|\s*|\t/g)
    .map((cell) => cell.trim())
    .filter(Boolean);

const headersFromContent = (content: any) => {
  if (Array.isArray(content.headers) && content.headers.length) {
    return content.headers.map(safeText).filter(Boolean);
  }

  return safeText(content.headersText) ? splitCells(content.headersText) : [];
};

const rowsFromContent = (content: any) => {
  if (Array.isArray(content.rows) && content.rows.length) {
    return content.rows
      .map((row: any) => (Array.isArray(row?.cells) ? row.cells.map(safeText) : []))
      .filter((row: string[]) => row.some(Boolean));
  }

  return safeText(content.rowsText)
    .split(/\r?\n/g)
    .map(splitCells)
    .filter((row) => row.length);
};

export function TableView({ content }: { content: any }) {
  const headers = headersFromContent(content);
  const rows = rowsFromContent(content);
  const caption = safeText(content.caption);
  const isArticle = content.variant === "article";
  const presentation = ["theme", "striped", "bordered", "minimal"].includes(content.presentation)
    ? content.presentation
    : "theme";

  if (!headers.length && !rows.length) {
    return (
      <section className={isArticle ? "w-full min-w-0 py-4" : ui.section} data-presentation={presentation} data-variant={isArticle ? "article" : "section"}>
        <div className={cx(ui.container, "rounded-[var(--site-radius-sm)] border border-dashed border-[var(--site-border)] p-8 text-center text-[var(--site-muted)]")}>
          Table has no rows yet.
        </div>
      </section>
    );
  }

  return (
    <section className={isArticle ? "w-full min-w-0 py-4" : ui.section} data-presentation={presentation} data-variant={isArticle ? "article" : "section"}>
      <div className={isArticle ? "mx-auto w-full max-w-[58.125rem]" : ui.container}>
        <div className="hidden overflow-x-auto rounded-[var(--site-radius-sm)] border border-[var(--site-border)] sm:block">
          <table className="w-full min-w-[42rem] border-collapse bg-[var(--site-background)] text-left text-sm text-[var(--site-text)]">
            {caption && (
              <caption className="border-b border-[var(--site-border)] bg-[var(--site-surface)] px-5 py-4 text-left font-[var(--font-heading)] text-lg font-extrabold text-[var(--site-heading)]">
                {caption}
              </caption>
            )}
            {headers.length > 0 && (
              <thead>
                <tr>
                  {headers.map((header: string, index: number) => (
                    <th className="border-b border-[var(--site-border)] bg-[var(--site-surface-soft)] px-5 py-4 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--site-heading)]" key={index} scope="col">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row: string[], rowIndex: number) => (
                <tr className={cx("border-b border-[var(--site-border)] last:border-0", presentation === "striped" && rowIndex % 2 === 1 && "bg-[var(--site-surface)]")} key={rowIndex}>
                  {row.map((cell: string, cellIndex: number) => (
                    <td className={cx("px-5 py-4 align-top", presentation === "bordered" && "border-r border-[var(--site-border)] last:border-r-0")} key={cellIndex}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 sm:hidden">
          {caption && <h3 className="m-0 rounded-[var(--site-radius-sm)] bg-[var(--site-surface)] px-5 py-4 font-[var(--font-heading)] text-lg font-extrabold text-[var(--site-heading)]">{caption}</h3>}
          {rows.map((row: string[], rowIndex: number) => (
            <dl className={cx("m-0 grid overflow-hidden rounded-[var(--site-radius-sm)] border border-[var(--site-border)] bg-[var(--site-background)]", presentation === "striped" && rowIndex % 2 === 1 && "bg-[var(--site-surface)]")} key={rowIndex}>
              {row.map((cell: string, cellIndex: number) => (
                <div className="grid grid-cols-[minmax(6rem,0.8fr)_minmax(0,1.2fr)] gap-3 border-b border-[var(--site-border)] px-4 py-3 last:border-0" key={cellIndex}>
                  <dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--site-muted)]">{headers[cellIndex] || `Column ${cellIndex + 1}`}</dt>
                  <dd className="m-0 break-words text-sm text-[var(--site-text)]">{cell || "—"}</dd>
                </div>
              ))}
            </dl>
          ))}
        </div>
      </div>
    </section>
  );
}
