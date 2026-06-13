import { describe, it, expect } from "vitest";
import { getFileUrl } from "../api";

// Regression coverage for round 4's getFileUrl fix: external URLs pass through
// unchanged, relative /uploads paths get the API base, and no token is appended
// when there's no localStorage (as in this node test environment).
describe("getFileUrl", () => {
  it("returns empty string for nullish input", () => {
    expect(getFileUrl("")).toBe("");
    expect(getFileUrl(null)).toBe("");
    expect(getFileUrl(undefined)).toBe("");
  });

  it("passes external/absolute URLs through unchanged", () => {
    expect(getFileUrl("https://via.placeholder.com/150")).toBe("https://via.placeholder.com/150");
    expect(getFileUrl("http://example.com/a.png")).toBe("http://example.com/a.png");
    expect(getFileUrl("//cdn.example.com/x.svg")).toBe("//cdn.example.com/x.svg");
  });

  it("passes data URIs through unchanged", () => {
    const data = "data:image/png;base64,AAAA";
    expect(getFileUrl(data)).toBe(data);
  });

  it("builds an absolute path for /uploads URLs and adds no token without localStorage", () => {
    const url = getFileUrl("/uploads/file.png");
    expect(url.endsWith("/uploads/file.png")).toBe(true);
    expect(url).not.toContain("token=");
  });

  it("normalizes a path missing the leading slash", () => {
    const url = getFileUrl("uploads/file.png");
    expect(url).toContain("/uploads/file.png");
  });
});
