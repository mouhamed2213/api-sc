import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import { getS3Client } from "../../config/s3";
import type { StorageObject, StorageProvider } from "./storage.interface";

export class S3StorageProvider implements StorageProvider {
  private readonly client;
  private readonly bucket: string;

  constructor() {
    const configured = getS3Client();
    this.client = configured.s3Client;
    this.bucket = configured.bucketName;
  }

  async put(input: { key: string; body: Buffer; contentType: string }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  }

  async get(key: string): Promise<StorageObject> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    if (!result.Body || !("pipe" in result.Body)) {
      throw new Error("Le stockage n'a retourné aucun flux média");
    }
    return {
      body: result.Body as Readable,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }
}
