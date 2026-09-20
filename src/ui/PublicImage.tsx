import Image, { type ImageProps } from "next/image";
import { canOptimizePublicImage } from "./publicImageHosts";

type PublicImageProps = Omit<ImageProps, "alt" | "src"> & {
  alt?: string;
  src: string;
};

const dimensionSuffix = /[-_](\d{2,5})x(\d{2,5})(?=\.[a-z0-9]+$)/i;

export const getPublicImageDimensions = (
  src: string,
  fallback = { width: 1200, height: 900 },
) => {
  try {
    const pathname = decodeURIComponent(new URL(src, "https://cms.invalid").pathname);
    const match = pathname.match(dimensionSuffix);
    if (!match) return fallback;
    return { width: Number(match[1]), height: Number(match[2]) };
  } catch {
    return fallback;
  }
};

export function PublicImage({ alt = "", src, unoptimized, ...props }: PublicImageProps) {
  const bypassOptimizer = /\.(?:gif|svg)(?:$|[?#])/i.test(src) || !canOptimizePublicImage(src);
  return <Image {...props} src={src} alt={alt} unoptimized={unoptimized ?? bypassOptimizer} />;
}
