import type { Readable } from "node:stream";

export interface StorageObject {
  body: Readable;
  contentType?: string;
  contentLength?: number;
}

export interface StorageProvider {
  put(input: { key: string; body: Buffer; contentType: string }): Promise<void>;
  get(key: string): Promise<StorageObject>;
  delete(key: string): Promise<void>;
}
