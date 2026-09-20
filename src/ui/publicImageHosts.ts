export const publicImageHosts = Array.from(new Set(
  (process.env.NEXT_PUBLIC_CMS_IMAGE_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean),
));

export const canOptimizePublicImage = (src: string) => {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && publicImageHosts.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};
