/** An expired version is different from an unpublished page or an origin outage. */
export class PublishedReleaseExpiredError extends Error {
  readonly code = "PUBLISHED_RELEASE_EXPIRED";
  constructor() { super("Published release has expired. Load the current published release."); }
}

export const isPublishedReleaseExpired = (error: unknown): error is PublishedReleaseExpiredError =>
  error instanceof PublishedReleaseExpiredError;

/** Retry exactly once, only on a confirmed expired version. Never mix releases. */
export async function recoverPublishedRelease<T>(
  requested: string | undefined,
  read: (release: string | undefined, recovering: boolean) => Promise<T>,
  current: () => Promise<string>,
): Promise<T> {
  try { return await read(requested, false); }
  catch (error) {
    if (!requested || !isPublishedReleaseExpired(error)) throw error;
    const latest = await current();
    if (!latest || latest === requested) throw error;
    return read(latest, true);
  }
}
