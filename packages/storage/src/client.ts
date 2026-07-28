import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type StorageConfig, storageConfig } from "./config.js";

let client: S3Client | undefined;
let clientConfig: StorageConfig | undefined;

function s3(config: StorageConfig): S3Client {
  // Rebuild when config changes so tests that repoint the endpoint are not
  // served a client bound to the previous one.
  if (!client || clientConfig?.endpoint !== config.endpoint) {
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      // Without this the SDK bakes a placeholder CRC32 into presigned URLs,
      // which a browser PUT cannot satisfy — it never sends the matching header.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    clientConfig = config;
  }
  return client;
}

export class UploadTooLargeError extends Error {
  constructor(readonly limitBytes: number) {
    super(`upload exceeds the ${Math.round(limitBytes / 1024 / 1024)} MB limit`);
  }
}

/**
 * Presigned PUT so the client uploads straight to storage — the API never
 * proxies audio bytes.
 *
 * S3 cannot enforce a byte cap on a presigned PUT, so the declared size is
 * rejected here and the actual stored size is re-checked on completion. Both
 * halves are needed: the first gives a fast client-side error, the second is
 * what a lying client cannot get past.
 */
export async function presignUpload(params: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn?: number;
}): Promise<{ url: string; expiresIn: number }> {
  const config = storageConfig();
  if (params.contentLength > config.maxUploadBytes) {
    throw new UploadTooLargeError(config.maxUploadBytes);
  }

  const expiresIn = params.expiresIn ?? 900;
  const url = await getSignedUrl(
    s3(config),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.key,
      ContentType: params.contentType,
    }),
    { expiresIn },
  );

  return { url, expiresIn };
}

/** Short-lived GET url. Used by the worker to fetch audio and by card downloads. */
export async function presignDownload(key: string, expiresIn = 900): Promise<string> {
  const config = storageConfig();
  return getSignedUrl(s3(config), new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
    expiresIn,
  });
}

export type ObjectStat = { size: number; contentType: string | undefined };

/** Null when the object is absent, so callers can tell "not uploaded" from "empty". */
export async function statObject(key: string): Promise<ObjectStat | null> {
  const config = storageConfig();
  try {
    const head = await s3(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const config = storageConfig();
  await s3(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function putObject(params: {
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<void> {
  const config = storageConfig();
  await s3(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
}
