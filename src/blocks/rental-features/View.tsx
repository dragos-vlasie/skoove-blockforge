"use client";

import { useRef, useState } from "react";

const normalizePublicImagePath = (src = "") =>
  src.startsWith("public/") ? src.replace(/^public/, "") : src;

const Item = ({
  feature,
  isOpen,
  setFeatureSelected,
}: {
  feature: any;
  isOpen: boolean;
  setFeatureSelected: () => void;
}) => {
  const accordion = useRef<HTMLDivElement | null>(null);
  const title = feature?.title || "";
  const description = feature?.description || "";
  const buttonText = feature?.buttonText || "Book now";

  const handleClick = (subjectLine: string) => {
    const subject = encodeURIComponent(`Book ${subjectLine}`);
    const body = encodeURIComponent(`Hi I would like to book ${subjectLine}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <li>
      <button
        className="relative flex w-full items-center gap-2 py-5 text-left text-base font-medium md:text-lg"
        onClick={(event) => {
          event.preventDefault();
          setFeatureSelected();
        }}
        aria-expanded={isOpen}
      >
        <span className={`flex-1 text-[var(--site-text)] ${isOpen ? "font-semibold text-[var(--site-primary)]" : ""}`}>
          <h3 className="inline">{title}</h3>
        </span>
      </button>

      <div
        ref={accordion}
        className="overflow-hidden text-[var(--site-muted)] transition-all duration-300 ease-in-out"
        style={isOpen ? { maxHeight: accordion.current?.scrollHeight, opacity: 1 } : { maxHeight: 0, opacity: 0 }}
      >
        <div className="pb-5 leading-relaxed text-balance">{description}</div>
        {buttonText && (
          <button
            onClick={() => handleClick(title)}
            className="mb-6 mt-6 min-w-36 rounded-[var(--site-radius-sm)] bg-[var(--site-primary)] px-5 py-3 font-bold text-[var(--site-on-primary)] hover:bg-[var(--site-primary-strong)]"
          >
            {buttonText}
          </button>
        )}
      </div>
    </li>
  );
};

const Media = ({ feature }: { feature: any }) => {
  const path = normalizePublicImagePath(feature?.path || "/city-rent/feature-car.jpeg");
  const alt = feature?.alt || feature?.title || "";

  return (
    <img
      src={path}
      alt={alt}
      className="aspect-square w-full rounded-2xl object-cover object-center sm:w-[26rem]"
      loading="lazy"
      decoding="async"
    />
  );
};

export function RentalFeaturesView({ content }: { content: any }) {
  const features = Array.isArray(content.features) ? content.features : [];
  const [featureSelected, setFeatureSelected] = useState(0);
  const selectedFeature = features[featureSelected] ?? features[0] ?? {};

  return (
    <section className="mx-auto max-w-7xl space-y-24 bg-[var(--site-background)] py-24 text-[var(--site-text)] md:space-y-32 md:py-32" id="services">
      <div className="px-8">
        <h2 className="mb-12 text-4xl font-extrabold tracking-tight text-[var(--site-heading)] lg:text-6xl md:mb-24">
          {content.heading}
          {content.featuredText && (
            <span className="ml-1 bg-[var(--site-inverse)] px-2 leading-relaxed text-[var(--site-on-inverse)] text-balance md:ml-1.5 md:px-4 md:text-nowrap">
              {content.featuredText}
            </span>
          )}
        </h2>
        <div className="gap-12 md:gap-24">
          <div className="flex flex-col justify-between gap-12 md:flex-row lg:gap-20">
            <ul className="w-full">
              {features.map((feature: any, index: number) => (
                <Item
                  key={`${feature.title}-${index}`}
                  feature={feature}
                  isOpen={featureSelected === index}
                  setFeatureSelected={() => setFeatureSelected(index)}
                />
              ))}
            </ul>

            <Media feature={selectedFeature} key={featureSelected} />
          </div>
        </div>
      </div>
    </section>
  );
}
