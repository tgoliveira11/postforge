import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ENV_EXAMPLE_PATH = resolve(process.cwd(), ".env.example");

const REQUIRED_ENV_KEYS = [
  "APP_BASE_URL",
  "APP_NAME",
  "APP_SLUG",
  "NODE_ENV",
  "DATABASE_URL",
  "DATABASE_POOL_MAX",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "AUTH_AFTER_LOGIN_PATH",
  "AUTH_AFTER_LOGOUT_PATH",
  "AUTH_REDIRECT_AUTHENTICATED_FROM_GUEST_PAGES",
  "AUTH_AUTHENTICATED_REDIRECT_PATH",
  "AUTH_GOOGLE_CLIENT_ID",
  "AUTH_GOOGLE_CLIENT_SECRET",
  "AUTH_APPLE_CLIENT_ID",
  "AUTH_APPLE_CLIENT_SECRET",
  "AUTH_MICROSOFT_CLIENT_ID",
  "AUTH_MICROSOFT_CLIENT_SECRET",
  "AUTH_MICROSOFT_TENANT_ID",
  "EMAIL_PROVIDER",
  "EMAIL_FROM",
  "RESEND_API_KEY",
  "EMAIL_REPLY_TO",
  "WEBAUTHN_RP_ID",
  "WEBAUTHN_RP_NAME",
  "WEBAUTHN_ORIGIN",
  "TWO_FACTOR_SECRET_ENCRYPTION_KEY",
  "AUTH_SESSION_MAX_AGE_SECONDS",
  "AUTH_SESSION_LAST_USED_UPDATE_SECONDS",
  "AUTH_SINGLE_ACTIVE_SESSION",
  "AUTH_SESSION_REVOCATION_POLL_SECONDS",
  "AUTH_PASSWORD_POLICY_ENFORCEMENT",
  "AUTH_PASSWORD_MIN_LENGTH",
  "AUTH_PASSWORD_REQUIRE_UPPERCASE",
  "AUTH_PASSWORD_REQUIRE_LOWERCASE",
  "AUTH_PASSWORD_REQUIRE_NUMBER",
  "AUTH_PASSWORD_REQUIRE_SYMBOL",
  "AUTH_PASSWORD_BLOCK_COMMON_PASSWORDS",
  "AUTH_PASSWORD_MIN_SCORE",
  "AUTH_PASSWORD_STRENGTH_POSITION",
  "EMAIL_VERIFICATION_SEND_ON_REGISTER",
  "EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN",
  "EMAIL_VERIFICATION_REQUIRE_FOR_ACCOUNT_APIS",
  "AUTH_SAME_ORIGIN_PROTECTION_ENABLED",
  "AUTH_ALLOWED_ORIGINS",
  "AUTH_RATE_LIMIT_STORE",
  "AUTH_COOKIE_SECURE",
  "AUTH_TRACE",
  "AUTH_DEBUG_EXPOSE_TRACE_ROUTE",
  "ADMIN_EMAIL",
  "PUBLIC_POSTS_PAGE_SIZE",
  "HOME_RECENT_POSTS_LIMIT",
  "HOME_POPULAR_CATEGORIES_LIMIT",
  "UPLOAD_PROVIDER",
  "UPLOAD_LOCAL_DIR",
  "UPLOAD_PUBLIC_BASE_URL",
  "UPLOAD_MAX_FILE_SIZE_BYTES",
  "BLOB_READ_WRITE_TOKEN",
  "CRON_SECRET",
  "ANALYTICS_ENABLED",
  "GOOGLE_ANALYTICS_MEASUREMENT_ID",
  "ANALYTICS_STORE_RAW_IP",
  "DEFAULT_TIMEZONE",
  "PUBLIC_SITE_THEME",
] as const;

function parseEnvExampleKeys(contents: string): Set<string> {
  const keys = new Set<string>();

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Z0-9_]+)=/);
    if (match?.[1]) {
      keys.add(match[1]);
    }
  }

  return keys;
}

describe(".env.example coverage", () => {
  it("includes all curated environment variables", () => {
    const contents = readFileSync(ENV_EXAMPLE_PATH, "utf8");
    const keys = parseEnvExampleKeys(contents);

    for (const key of REQUIRED_ENV_KEYS) {
      expect(keys.has(key), `missing ${key} in .env.example`).toBe(true);
    }
  });
});
