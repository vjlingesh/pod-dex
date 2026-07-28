import { env, numberEnv, optionalEnv } from "@pod-dex/env";

/**
 * Storage settings, read at call time rather than captured at import, so tests
 * can point the client at a different bucket or endpoint.
 */
export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** MinIO needs path-style addressing; R2 does not. */
  forcePathStyle: boolean;
  maxUploadBytes: number;
};

export function storageConfig(): StorageConfig {
  return {
    endpoint: env("S3_ENDPOINT"),
    region: env("S3_REGION", "auto"),
    bucket: env("S3_BUCKET"),
    accessKeyId: env("S3_ACCESS_KEY_ID"),
    secretAccessKey: env("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: optionalEnv("S3_FORCE_PATH_STYLE") !== "false",
    maxUploadBytes: numberEnv("MAX_UPLOAD_BYTES", 500 * 1024 * 1024),
  };
}
