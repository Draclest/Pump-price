const _CSS_COLOR_RE = /^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{3}$/;
const _FALLBACK_COLOR = '#94a3b8';

/** Returns the brand color only if it is a safe CSS hex color, otherwise the fallback. */
export function safeBrandColor(brandColor: string | null | undefined): string {
  if (brandColor && _CSS_COLOR_RE.test(brandColor)) return brandColor;
  return _FALLBACK_COLOR;
}

/** Returns the first letter of the brand/name, uppercased. */
export function brandInitial(name: string | null | undefined): string {
  return (name ?? '?').charAt(0).toUpperCase();
}
