import { describe, expect, it } from "vitest";
import { formatBytesHuman } from "@/lib/format-bytes";

describe("formatBytesHuman", () => {
  it("formats values under 1 KB as bytes", () => {
    expect(formatBytesHuman(0)).toBe("0 B");
    expect(formatBytesHuman(512)).toBe("512 B");
    expect(formatBytesHuman(1023)).toBe("1023 B");
  });

  it("formats kilobytes with integer values without decimals", () => {
    expect(formatBytesHuman(1024)).toBe("1 KB");
    expect(formatBytesHuman(2048)).toBe("2 KB");
    expect(formatBytesHuman(10240)).toBe("10 KB");
  });

  it("formats kilobytes with fractional values to one decimal", () => {
    expect(formatBytesHuman(1536)).toBe("1.5 KB");
    expect(formatBytesHuman(2560)).toBe("2.5 KB");
  });

  it("formats megabytes with integer values without decimals", () => {
    expect(formatBytesHuman(1024 * 1024)).toBe("1 MB");
    expect(formatBytesHuman(2 * 1024 * 1024)).toBe("2 MB");
  });

  it("formats megabytes with fractional values to one decimal", () => {
    expect(formatBytesHuman(1.5 * 1024 * 1024)).toBe("1.5 MB");
    expect(formatBytesHuman(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
