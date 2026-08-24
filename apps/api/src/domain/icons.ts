import { isAllowedIconMimeType } from "@my-fpl/shared";
import type { Storage } from "../plugins/storage.js";

export class InvalidIconFileError extends Error {}

const ICONS_BUCKET = "icons";

export async function uploadIconFile(
  storage: Storage,
  params: { path: string; buffer: Buffer; mimeType: string },
) {
  if (!isAllowedIconMimeType(params.mimeType)) {
    throw new InvalidIconFileError(`Unsupported image type: ${params.mimeType}`);
  }

  const { error } = await storage.from(ICONS_BUCKET).upload(params.path, params.buffer, {
    contentType: params.mimeType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Failed to upload icon: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = storage.from(ICONS_BUCKET).getPublicUrl(params.path);

  // Uploads upsert to a stable per-entity path, and the bucket sets a long
  // cache lifetime — without a cache-busting suffix, a browser that already
  // fetched the old icon at this URL would keep showing it after a
  // re-upload until its cache naturally expired.
  return `${publicUrl}?v=${Date.now()}`;
}
