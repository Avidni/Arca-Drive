import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, getBucketName } from "./client";

export async function deleteR2Object(r2Key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getBucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: r2Key,
  });

  await client.send(command);
}
