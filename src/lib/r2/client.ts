import { S3Client } from "@aws-sdk/client-s3";
import { getServerEnv } from "@/lib/env";

let client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (client) return client;

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } =
    getServerEnv();

  client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });

  return client;
}

export function getBucketName(): string {
  const { R2_BUCKET_NAME } = getServerEnv();
  return R2_BUCKET_NAME;
}

export function getPublicBaseUrl(): string {
  const { R2_PUBLIC_BASE_URL } = getServerEnv();
  return R2_PUBLIC_BASE_URL;
}
