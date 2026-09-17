"use client";

import { useEffect, useRef, useState } from "react";

type Gateway = {
  title: string;
  href: string;
  image: string;
  imageAlt?: string;
  imagePosition?: string;
};

export function PublicationGatewayCarouselView({ content }: { content: any }) {
  const items = (Array.isArray(content.items) ? content.items : []).filter((item: Gateway) => item?.title && item?.href);
  const trackRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const [mobile, setMobile] = useState(false);
  const pageCount = mobile ? items.length : Math.max(1, Math.ceil(items.length / 3));
  const hasItems = items.length > 0;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 699px)");
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const move = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(pageCount - 1, position + direction));
    setPosition(next);
    const track = trackRef.current;
    if (!track) return;
    const target = mobile
      ? track.querySelector<HTMLElement>(`[data-gateway-index="${next}"]`)
      : track.querySelector<HTMLElement>(`[data-gateway-group="${next}"]`);
    if (target) {
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "nearest",
        inline: "start",
      });
    }
  };

  const syncPosition = () => {
    const track = trackRef.current;
    if (!track) return;
    const candidates = [...track.querySelectorAll<HTMLElement>(mobile ? "[data-gateway-index]" : "[data-gateway-group]")];
    if (!candidates.length) return;
    const left = track.getBoundingClientRect().left;
    const next = candidates.reduce((best, candidate, index) =>
      Math.abs(candidate.getBoundingClientRect().left - left) < Math.abs(candidates[best].getBoundingClientRect().left - left) ? index : best, 0);
    setPosition(next);
  };

  return (
    <section className="w-full overflow-hidden bg-[var(--site-background)] px-[var(--site-gutter)] py-[var(--site-section-space)] text-[var(--site-text)]" aria-label={content.ariaLabel || "Explore publication topics"}>
      <h1 className="mx-auto mb-8 w-full max-w-[var(--site-container-width)] text-balance font-[var(--font-heading)] text-[clamp(2.5rem,5vw,5rem)] font-[var(--site-heading-weight)] leading-[0.96] tracking-[var(--site-heading-tracking)] text-[var(--site-heading)]">{content.title || "Explore the publication"}</h1>
      {!hasItems ? (
        <div className="mx-auto grid min-h-48 w-full max-w-[var(--site-container-width)] place-items-center rounded-[var(--site-card-radius)] border border-dashed border-[var(--site-border)] bg-[var(--site-surface)] px-6 text-center text-sm font-semibold text-[var(--site-muted)]">
          Add gateway cards to create a visual path through the publication.
        </div>
      ) : <div className="mx-auto flex w-full max-w-[var(--site-container-width)] snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" ref={trackRef} onScroll={syncPosition}>
        {Array.from({ length: Math.ceil(items.length / 3) }, (_, groupIndex) => (
          <div className="grid w-full shrink-0 snap-start gap-5 md:grid-cols-2 lg:grid-cols-[1.35fr_0.9fr] lg:grid-rows-2" data-gateway-group={groupIndex} key={groupIndex}>
            {items.slice(groupIndex * 3, groupIndex * 3 + 3).map((item: Gateway, localIndex: number) => {
              const itemIndex = groupIndex * 3 + localIndex;
              return (
                <a
                  className={`group relative min-h-[20rem] overflow-hidden rounded-[var(--site-media-radius)] bg-[var(--site-inverse)] text-[var(--site-on-inverse)] no-underline ${localIndex === 0 ? "md:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-[40rem]" : "lg:col-start-2 lg:min-h-0"}`}
                  data-gateway-index={itemIndex}
                  data-size={localIndex === 0 ? "lead" : "support"}
                  href={item.href}
                  key={`${item.href}-${itemIndex}`}
                >
                  {item.image ? <img
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    src={item.image}
                    alt={item.imageAlt || ""}
                    loading={itemIndex === 0 ? "eager" : "lazy"}
                    decoding="async"
                    style={{ objectPosition: item.imagePosition || "center" }}
                  /> : <span className="absolute inset-0 bg-[linear-gradient(145deg,var(--site-primary),var(--site-inverse))]" aria-hidden="true" />}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" aria-hidden="true" />
                  <h2 className="absolute inset-x-6 bottom-6 z-10 m-0 max-w-[18ch] font-[var(--font-heading)] text-2xl font-extrabold leading-tight text-white sm:text-3xl">{item.title}</h2>
                  <span className="absolute right-5 top-5 z-10 grid size-11 place-items-center rounded-full bg-white/90 text-xl text-[var(--site-heading)] transition group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true">↗</span>
                </a>
              );
            })}
          </div>
        ))}
      </div>}
      {hasItems && <div className="mx-auto mt-6 flex w-full max-w-[var(--site-container-width)] items-center justify-end gap-3">
        <button className="grid size-12 place-items-center rounded-full border border-[var(--site-border)] bg-[var(--site-background)] text-xl disabled:cursor-not-allowed disabled:opacity-35" type="button" onClick={() => move(-1)} disabled={position === 0} aria-label="Previous destinations">←</button>
        <span className="min-w-16 text-center text-sm font-bold text-[var(--site-muted)]" aria-live="polite">{position + 1} / {pageCount}</span>
        <button className="grid size-12 place-items-center rounded-full border border-[var(--site-border)] bg-[var(--site-background)] text-xl disabled:cursor-not-allowed disabled:opacity-35" type="button" onClick={() => move(1)} disabled={position >= pageCount - 1} aria-label="Next destinations">→</button>
      </div>}
    </section>
  );
}
