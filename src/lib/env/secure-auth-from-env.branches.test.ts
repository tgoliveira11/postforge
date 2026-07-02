import { describe, expect, it } from "vitest";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";

describe("buildSecureAuthConfigFromEnv branch coverage", () => {
  const defaults = {
    appName: "PostForge",
    appSlug: "postforge",
    baseUrl: "http://localhost:3000",
    afterLoginPath: "/admin",
    afterLogoutPath: "/logout",
  };

  it("derives cookieSecure from NODE_ENV when env override is absent", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      NEXTAUTH_SECRET: "secret",
      TWO_FACTOR_SECRET_ENCRYPTION_KEY: "2fa-key",
      NODE_ENV: "production",
    });

    expect(config.server?.cookieSecure).toBe(true);
  });

  it("honors explicit cookie secure overrides", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      NEXTAUTH_SECRET: "secret",
      TWO_FACTOR_SECRET_ENCRYPTION_KEY: "2fa-key",
      AUTH_COOKIE_SECURE: "false",
      NODE_ENV: "production",
    });

    expect(config.server?.cookieSecure).toBe(false);
  });

  it("uses custom auth redirect paths from env", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      NEXTAUTH_SECRET: "secret",
      TWO_FACTOR_SECRET_ENCRYPTION_KEY: "2fa-key",
      AUTH_AFTER_LOGIN_PATH: "/dashboard",
      AUTH_AFTER_LOGOUT_PATH: "/goodbye",
    });

    expect(config.auth.afterLoginPath).toBe("/dashboard");
    expect(config.auth.afterLogoutPath).toBe("/goodbye");
    expect(config.auth.authenticatedRedirectPath).toBe("/dashboard");
  });

  it("configures microsoft oauth with tenant id when credentials exist", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      NEXTAUTH_SECRET: "secret",
      TWO_FACTOR_SECRET_ENCRYPTION_KEY: "2fa-key",
      AUTH_MICROSOFT_CLIENT_ID: "ms-client",
      AUTH_MICROSOFT_CLIENT_SECRET: "ms-secret",
      AUTH_MICROSOFT_TENANT_ID: "tenant-123",
    });

    expect(config.oauth?.microsoft).toEqual({
      clientId: "ms-client",
      clientSecret: "ms-secret",
      tenantId: "tenant-123",
    });
  });

  it("defaults rate limiting to postgres when NODE_ENV is production", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      NEXTAUTH_SECRET: "secret",
      TWO_FACTOR_SECRET_ENCRYPTION_KEY: "2fa-key",
      NODE_ENV: "production",
    });

    expect(config.rateLimit?.store).toBe("postgres");
    expect(config.server?.environment).toBe("production");
  });

  it("maps trust forwarded headers and v0.3 feature flags from env", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      NEXTAUTH_SECRET: "secret",
      TWO_FACTOR_SECRET_ENCRYPTION_KEY: "2fa-key",
      AUTH_TRUST_FORWARDED_HEADERS: "true",
      AUTH_MAGIC_LINK_ENABLED: "true",
      AUTH_ADMIN_ENABLED: "true",
      AUTH_ADMIN_PATH: "/custom-admin",
      AUTH_INVITES_ENABLED: "true",
    });

    expect(config.security?.trustForwardedHeaders).toBe(true);
    expect(config.auth.magicLink?.enabled).toBe(true);
    expect(config.admin?.enabled).toBe(true);
    expect(config.admin?.path).toBe("/custom-admin");
    expect(config.invites?.enabled).toBe(true);
  });
});
