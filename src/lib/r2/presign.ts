import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getBucketName, getPublicBaseUrl } from "./client";
import { v4 as uuidv4 } from "uuid";

type Category = "image" | "video" | "document" | "files";

export async function generatePresignedUploadUrl(params: {
  category: Category;
  userId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  const { category, userId, fileName, mimeType, fileSize } = params;
  const client = getR2Client();
  const bucket = getBucketName();
  const publicBase = getPublicBaseUrl();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uuid = uuidv4();
  const safeName = fileName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9.-]/g, "");
  const r2Key = `${category}/${userId}/${year}/${month}/${uuid}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: r2Key,
    ContentType: mimeType,
    ContentLength: fileSize,
  });

  const presignedUrl = await getSignedUrl(client, command, {
    expiresIn: 3600,
  });

  const publicUrl = `${publicBase}/${r2Key}`;

  return { presignedUrl, r2Key, publicUrl };
}
