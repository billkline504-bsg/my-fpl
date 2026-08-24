export const ALLOWED_ICON_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedIconMimeType = (typeof ALLOWED_ICON_MIME_TYPES)[number];

export const MAX_ICON_SIZE_BYTES = 2_000_000;

export function isAllowedIconMimeType(mimeType: string): mimeType is AllowedIconMimeType {
  return (ALLOWED_ICON_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function extensionForIconMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}
