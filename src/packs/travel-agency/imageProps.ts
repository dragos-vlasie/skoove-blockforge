type TravelImageOptions = {
  eager?: boolean;
  sizes?: string;
};

const shouldUseNetlifyImageCdn =
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  process.env.NETLIFY === "true";

const responsiveWidths = [640, 960, 1200] as const;

const netlifyImageUrl = (url: string, width: number) =>
  `/.netlify/images?url=${encodeURIComponent(url)}&w=${width}&q=72`;

export const getTravelImageProps = (
  src: string,
  options: TravelImageOptions = {},
) => {
  const eager = options.eager === true;
  const useNetlifyImageCdn =
    shouldUseNetlifyImageCdn &&
    (/^\//.test(src) || /^https?:\/\//i.test(src));

  return {
    src: useNetlifyImageCdn ? netlifyImageUrl(src, 1200) : src,
    loading: eager ? ("eager" as const) : ("lazy" as const),
    decoding: "async" as const,
    fetchPriority: eager ? ("high" as const) : ("auto" as const),
    ...(useNetlifyImageCdn
      ? {
          srcSet: responsiveWidths
            .map((width) => `${netlifyImageUrl(src, width)} ${width}w`)
            .join(", "),
          sizes: options.sizes || "100vw",
        }
      : {}),
  };
};
