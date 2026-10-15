import { describe, expect, it } from "vitest";
import { MediaService } from "./media.service";
import {
  mediaMaxBytes,
  resolveMediaMime,
  validateMediaSignature,
} from "./media.validation";

describe("media validation", () => {
  it("accepts supported MIME types and strips parameters", () => {
    expect(resolveMediaMime("image/webp")).toBe("image/webp");
    expect(resolveMediaMime("video/mp4; codecs=h264")).toBe("video/mp4");
  });

  it("rejects unsupported MIME types", () => {
    expect(() => resolveMediaMime("image/svg+xml")).toThrow();
    expect(() => resolveMediaMime("application/octet-stream")).toThrow();
  });

  it("applies separate image and video upload limits", () => {
    expect(mediaMaxBytes("image")).toBe(12 * 1024 * 1024);
    expect(mediaMaxBytes("video")).toBe(30 * 1024 * 1024);
  });

  it("checks signatures instead of trusting the MIME header", () => {
    expect(() => validateMediaSignature(Buffer.from("<svg/>"), "image/png")).toThrow();
    expect(() =>
      validateMediaSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg")
    ).not.toThrow();
    expect(() =>
      validateMediaSignature(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), "video/webm")
    ).not.toThrow();
  });
});

describe("stored media references", () => {
  it("collects only media keys belonging to the target fiche", () => {
    const keys = MediaService.collectStoredMediaKeys({
      photo: "https://api.example.test/api/media/7/123e4567-e89b-12d3-a456-426614174000.webp",
      gallery: [
        { url: "/api/media/7/123e4567-e89b-12d3-a456-426614174001.mp4" },
        { url: "/api/media/8/123e4567-e89b-12d3-a456-426614174002.jpg" },
      ],
    }, 7);
    expect([...keys].sort()).toEqual([
      "123e4567-e89b-12d3-a456-426614174000.webp",
      "123e4567-e89b-12d3-a456-426614174001.mp4",
    ]);
  });
});
