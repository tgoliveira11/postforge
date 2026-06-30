import { describe, expect, it, vi } from "vitest";
import { devEmailProvider } from "@/lib/email/dev-email-provider";

describe("dev email provider", () => {
  it("logs email delivery to the console", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await devEmailProvider.send({
      to: "user@example.com",
      subject: "Hello",
      text: "Plain text",
      html: "<p>HTML</p>",
    });

    expect(infoSpy).toHaveBeenCalledWith(
      "[postforge email]",
      expect.objectContaining({
        to: "user@example.com",
        subject: "Hello",
      })
    );

    infoSpy.mockRestore();
  });
});
