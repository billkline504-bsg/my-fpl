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
  return publicUrl;
}
