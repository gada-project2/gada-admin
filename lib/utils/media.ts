/**
 * Storage key → displayable URL.
 *
 * Every image field the API returns (Event.bannerKey, User.photoKey,
 * VendorProfile.logoKey, VendorGallery.imageKey) is an object-storage KEY, not
 * a URL. Rendering one straight into an <img src> yields a broken image.
 *
 * The R2 bucket currently serves objects publicly, so resolving a key is a
 * string join — no presign round-trip, and none is possible from here anyway:
 * GET /v1/storage/presign/download/* is behind the *user* JwtGuard, which an
 * admin JWT cannot satisfy (different signing secret).
 *
 * THIS IS THE ONLY PLACE THAT KNOWS HOW KEYS BECOME URLS. If the bucket is ever
 * locked down, swap the join here for a signed-URL lookup and every caller
 * follows — that is the entire reason this indirection exists.
 */

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';

export function keyToUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  // Already-resolved absolute URLs pass through untouched.
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  if (!R2_PUBLIC_URL) return null;
  return `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}

/**
 * A vendor's display image: their own logo, falling back to the first gallery
 * photo only when no logo is set. The fallback is a display convenience — a
 * gallery photo is not a logo, which is why logoKey exists as its own field.
 */
export function vendorImageUrl(vendor: {
  logoKey?: string | null;
  gallery?: { imageKey: string }[] | null;
}): string | null {
  return keyToUrl(vendor.logoKey) ?? keyToUrl(vendor.gallery?.[0]?.imageKey);
}

/** Initials fallback for when there is no avatar to show. */
export function initialsOf(name: string | null | undefined): string {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
