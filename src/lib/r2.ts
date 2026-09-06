import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "hobby-tracker-photos";
export const NEXT_PUBLIC_R2_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ""
).replace(/\/$/, "");

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Returns the full public URL for an R2 key or existing URL.
 */
export function getR2PublicUrl(keyOrUrl: string | null | undefined): string {
  if (!keyOrUrl) return "/placeholder-miniature.png";
  if (
    keyOrUrl.startsWith("http://") ||
    keyOrUrl.startsWith("https://") ||
    keyOrUrl.startsWith("/")
  ) {
    return keyOrUrl;
  }
  if (keyOrUrl.startsWith("logos/")) {
    return `/${keyOrUrl}`;
  }
  const cleanKey = keyOrUrl.replace(/^\/+/, "");
  if (!NEXT_PUBLIC_R2_PUBLIC_URL) {
    return `/${cleanKey}`;
  }
  return `${NEXT_PUBLIC_R2_PUBLIC_URL}/${cleanKey}`;
}

/**
 * Generates a presigned URL for direct client-side upload (PUT) to Cloudflare R2.
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<{ presignedUrl: string; key: string; publicUrl: string }> {
  const cleanKey = key.replace(/^\/+/, "");
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanKey,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  const publicUrl = getR2PublicUrl(cleanKey);

  return { presignedUrl, key: cleanKey, publicUrl };
}

/**
 * Deletes an object from Cloudflare R2 bucket.
 */
export async function deleteR2Object(keyOrUrl: string): Promise<void> {
  if (!keyOrUrl) return;
  let key = keyOrUrl;
  if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
    if (NEXT_PUBLIC_R2_PUBLIC_URL && keyOrUrl.startsWith(NEXT_PUBLIC_R2_PUBLIC_URL)) {
      key = keyOrUrl.replace(NEXT_PUBLIC_R2_PUBLIC_URL, "").replace(/^\/+/, "");
    } else {
      try {
        const url = new URL(keyOrUrl);
        key = url.pathname.replace(/^\/+/, "");
      } catch {
        key = keyOrUrl.replace(/^\/+/, "");
      }
    }
  } else {
    key = key.replace(/^\/+/, "");
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Uploads a Buffer/Uint8Array to R2 server-side.
 */
export async function uploadR2Object(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ key: string; publicUrl: string }> {
  const cleanKey = key.replace(/^\/+/, "");
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanKey,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);
  return { key: cleanKey, publicUrl: getR2PublicUrl(cleanKey) };
}

/**
 * Downloads an object from R2 as Buffer server-side.
 */
export async function downloadR2Object(keyOrUrl: string): Promise<Buffer> {
  let key = keyOrUrl;
  if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
    if (NEXT_PUBLIC_R2_PUBLIC_URL && keyOrUrl.startsWith(NEXT_PUBLIC_R2_PUBLIC_URL)) {
      key = keyOrUrl.replace(NEXT_PUBLIC_R2_PUBLIC_URL, "").replace(/^\/+/, "");
    } else {
      try {
        const url = new URL(keyOrUrl);
        key = url.pathname.replace(/^\/+/, "");
      } catch {
        key = keyOrUrl.replace(/^\/+/, "");
      }
    }
  } else {
    key = key.replace(/^\/+/, "");
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  if (!response.Body) {
    throw new Error(`Empty body returned from R2 for key: ${key}`);
  }

  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}
