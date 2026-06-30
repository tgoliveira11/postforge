import { afterEach, describe, expect, it } from "vitest";
import {
  readAdminEmail,
  readAnalyticsStoreRawIp,
  readBlobReadWriteToken,
  readEmailFrom,
  readEmailProvider,
  readEmailReplyTo,
  readEnv,
  readResendApiKey,
  readUploadLocalDir,
  readUploadMaxFileSizeBytes,
  readUploadProvider,
  readUploadPublicBaseUrl,
  requireEnv,
} from "@/lib/env";

describe("readEnv", () => {
  const original = process.env.TEST_READ_ENV;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.TEST_READ_ENV;
    } else {
      process.env.TEST_READ_ENV = original;
    }
  });

  it("returns undefined for missing or blank values", () => {
    delete process.env.TEST_READ_ENV;
    expect(readEnv("TEST_READ_ENV")).toBeUndefined();

    process.env.TEST_READ_ENV = "   ";
    expect(readEnv("TEST_READ_ENV")).toBeUndefined();
  });

  it("returns trimmed values", () => {
    process.env.TEST_READ_ENV = "  hello  ";
    expect(readEnv("TEST_READ_ENV")).toBe("hello");
  });
});

describe("requireEnv", () => {
  const original = process.env.REQUIRED_TEST_KEY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.REQUIRED_TEST_KEY;
    } else {
      process.env.REQUIRED_TEST_KEY = original;
    }
  });

  it("throws when the variable is missing or blank", () => {
    delete process.env.REQUIRED_TEST_KEY;
    expect(() => requireEnv("REQUIRED_TEST_KEY")).toThrow(
      "REQUIRED_TEST_KEY is not set"
    );

    process.env.REQUIRED_TEST_KEY = "  ";
    expect(() => requireEnv("REQUIRED_TEST_KEY")).toThrow(
      "REQUIRED_TEST_KEY is not set"
    );
  });

  it("returns the trimmed value when set", () => {
    process.env.REQUIRED_TEST_KEY = "  value  ";
    expect(requireEnv("REQUIRED_TEST_KEY")).toBe("value");
  });
});

describe("readAdminEmail", () => {
  const original = process.env.ADMIN_EMAIL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ADMIN_EMAIL;
    } else {
      process.env.ADMIN_EMAIL = original;
    }
  });

  it("returns lowercase email when set", () => {
    process.env.ADMIN_EMAIL = "Admin@Example.com";
    expect(readAdminEmail()).toBe("admin@example.com");
  });

  it("returns undefined when unset", () => {
    delete process.env.ADMIN_EMAIL;
    expect(readAdminEmail()).toBeUndefined();
  });
});

describe("upload configuration readers", () => {
  const originals = {
    UPLOAD_LOCAL_DIR: process.env.UPLOAD_LOCAL_DIR,
    UPLOAD_PUBLIC_BASE_URL: process.env.UPLOAD_PUBLIC_BASE_URL,
    UPLOAD_MAX_FILE_SIZE_BYTES: process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
    UPLOAD_MAX_FILE_SIZE: process.env.UPLOAD_MAX_FILE_SIZE,
    STORAGE_MAX_UPLOAD_BYTES: process.env.STORAGE_MAX_UPLOAD_BYTES,
    UPLOAD_PROVIDER: process.env.UPLOAD_PROVIDER,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("uses upload defaults when unset", () => {
    delete process.env.UPLOAD_LOCAL_DIR;
    delete process.env.UPLOAD_PUBLIC_BASE_URL;
    delete process.env.UPLOAD_MAX_FILE_SIZE_BYTES;
    delete process.env.UPLOAD_MAX_FILE_SIZE;
    delete process.env.STORAGE_MAX_UPLOAD_BYTES;

    expect(readUploadLocalDir()).toBe("./storage/uploads");
    expect(readUploadPublicBaseUrl()).toBe("/api/assets");
    expect(readUploadMaxFileSizeBytes()).toBe(5 * 1024 * 1024);
  });

  it("reads upload max file size from alternate keys", () => {
    delete process.env.UPLOAD_MAX_FILE_SIZE_BYTES;
    process.env.UPLOAD_MAX_FILE_SIZE = "1048576";
    expect(readUploadMaxFileSizeBytes()).toBe(1048576);

    delete process.env.UPLOAD_MAX_FILE_SIZE;
    process.env.STORAGE_MAX_UPLOAD_BYTES = "2097152";
    expect(readUploadMaxFileSizeBytes()).toBe(2097152);
  });

  it("falls back to default for invalid upload max file size values", () => {
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES = "not-a-number";
    expect(readUploadMaxFileSizeBytes()).toBe(5 * 1024 * 1024);

    process.env.UPLOAD_MAX_FILE_SIZE_BYTES = "0";
    expect(readUploadMaxFileSizeBytes()).toBe(5 * 1024 * 1024);
  });

  it("reads upload provider and blob token", () => {
    process.env.UPLOAD_PROVIDER = "vercel-blob";
    process.env.BLOB_READ_WRITE_TOKEN = "token";

    expect(readUploadProvider()).toBe("vercel-blob");
    expect(readBlobReadWriteToken()).toBe("token");
  });
});

describe("email configuration readers", () => {
  const originals = {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("reads email provider settings", () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "from@example.com";
    process.env.EMAIL_REPLY_TO = "reply@example.com";

    expect(readEmailProvider()).toBe("resend");
    expect(readResendApiKey()).toBe("re_test");
    expect(readEmailFrom()).toBe("from@example.com");
    expect(readEmailReplyTo()).toBe("reply@example.com");
  });
});

describe("readAnalyticsStoreRawIp", () => {
  const original = process.env.ANALYTICS_STORE_RAW_IP;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ANALYTICS_STORE_RAW_IP;
    } else {
      process.env.ANALYTICS_STORE_RAW_IP = original;
    }
  });

  it("returns true for affirmative values", () => {
    process.env.ANALYTICS_STORE_RAW_IP = "true";
    expect(readAnalyticsStoreRawIp()).toBe(true);

    process.env.ANALYTICS_STORE_RAW_IP = "1";
    expect(readAnalyticsStoreRawIp()).toBe(true);

    process.env.ANALYTICS_STORE_RAW_IP = "YES";
    expect(readAnalyticsStoreRawIp()).toBe(true);
  });

  it("returns false for other values or when unset", () => {
    delete process.env.ANALYTICS_STORE_RAW_IP;
    expect(readAnalyticsStoreRawIp()).toBe(false);

    process.env.ANALYTICS_STORE_RAW_IP = "false";
    expect(readAnalyticsStoreRawIp()).toBe(false);
  });
});
