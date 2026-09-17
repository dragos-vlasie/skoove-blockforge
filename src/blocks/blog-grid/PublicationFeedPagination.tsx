import { useEffect, useMemo, useRef, useState } from "react";
import { BlogGridView } from "./View";
import type { BlogGridListing } from "./listing";

type Props = {
  content: any;
  pages: any[][];
  initialPage: number;
  path?: string;
  pageSize: number;
};

const pageFromPath = (pathname: string) => {
  const match = pathname.match(/\/page\/(\d+)\/?$/);
  return match ? Number(match[1]) : 1;
};

export function PublicationFeedPagination({
  content,
  pages,
  initialPage,
  path = "/",
  pageSize,
}: Props) {
  const totalPages = Math.max(1, pages.length);
  const clampPage = (value: number) => Math.min(totalPages, Math.max(1, value || 1));
  const [currentPage, setCurrentPage] = useState(clampPage(initialPage));
  const rootRef = useRef<HTMLDivElement>(null);
  const baseTitleRef = useRef("");
  const paginationBasePath = content.paginationBasePath || path.replace(/page\/\d+\/$/, "") || "/";
  const normalizedBase = paginationBasePath.endsWith("/") ? paginationBasePath : `${paginationBasePath}/`;

  const listing = useMemo<BlogGridListing>(() => ({
    posts: pages[currentPage - 1] ?? [],
    currentPage,
    totalPages,
    pageSize,
    isPaginated: totalPages > 1,
  }), [currentPage, pageSize, pages, totalPages]);

  const hrefForPage = (targetPage: number) =>
    targetPage === 1 ? normalizedBase : `${normalizedBase}page/${targetPage}/`;

  useEffect(() => {
    baseTitleRef.current = document.title.replace(/\s+[–-]\s+Page\s+\d+$/i, "");
    const handlePopState = () => setCurrentPage(clampPage(pageFromPath(window.location.pathname)));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!baseTitleRef.current) return;
    const href = hrefForPage(currentPage);
    const absoluteUrl = new URL(href, window.location.origin).toString();
    document.title = currentPage > 1 ? `${baseTitleRef.current} – Page ${currentPage}` : baseTitleRef.current;
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", absoluteUrl);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute("content", absoluteUrl);
  }, [currentPage]);

  const selectPage = (targetPage: number) => {
    const nextPage = clampPage(targetPage);
    if (nextPage === currentPage) return;
    window.history.pushState({ blockforgePage: nextPage }, "", hrefForPage(nextPage));
    setCurrentPage(nextPage);
    window.dispatchEvent(new CustomEvent("blockforge:page-view"));
    window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLElement>("[data-blog-grid-heading], [data-blog-grid-items]")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="min-w-0" ref={rootRef}>
      <BlogGridView
        content={content}
        page={currentPage}
        path={path}
        resolvedListing={listing}
        onPageChange={selectPage}
      />
      <p className="sr-only" aria-live="polite">Showing posts page {currentPage} of {totalPages}.</p>
    </div>
  );
}
