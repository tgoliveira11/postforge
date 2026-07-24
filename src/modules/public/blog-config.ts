import { eq } from "drizzle-orm";
import { db } from "@/db/get-db";
import { blogSettings } from "@/modules/settings/blog-settings.schema";
import { readEnv } from "@/lib/env";

export type BlogConfig = {
  title: string;
  description: string;
  baseUrl: string;
  postsPerPage: number;
  rssEnabled: boolean;
  analyticsEnabled: boolean;
  googleAnalyticsMeasurementId?: string | null;
  defaultSeoImage: string | null;
  language?: string;
  locale?: string;
  authorName?: string | null;
  publisherName?: string | null;
};

const DEFAULT_CONFIG: BlogConfig = {
  title: "PostForge",
  description: "Markdown-based blog publishing platform",
  baseUrl: "http://localhost:3000",
  postsPerPage: 12,
  rssEnabled: true,
  analyticsEnabled: true,
  googleAnalyticsMeasurementId: null,
  defaultSeoImage: null,
  language: "en",
  locale: "en_US",
  authorName: null,
  publisherName: null,
};

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function readSettingOrEnv(
  map: Map<string, string>,
  settingKey: string,
  envKeys: string[]
): string | null {
  const settingValue = map.get(settingKey)?.trim();
  if (settingValue) return settingValue;

  for (const envKey of envKeys) {
    const value = readEnv(envKey);
    if (value) return value;
  }

  return null;
}

export async function getBlogConfig(): Promise<BlogConfig> {
  const rows = await db.select().from(blogSettings);
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const analyticsEnabled = readBoolean(
    map.get("analyticsEnabled") ?? readEnv("ANALYTICS_ENABLED"),
    DEFAULT_CONFIG.analyticsEnabled
  );
  const googleAnalyticsMeasurementId = readSettingOrEnv(map, "googleAnalyticsMeasurementId", [
    "GOOGLE_ANALYTICS_MEASUREMENT_ID",
    "NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  ]);

  return {
    title: map.get("blogTitle") ?? readEnv("APP_NAME") ?? DEFAULT_CONFIG.title,
    description: map.get("blogDescription") ?? DEFAULT_CONFIG.description,
    baseUrl: map.get("baseUrl") ?? readEnv("APP_BASE_URL") ?? readEnv("NEXTAUTH_URL") ?? DEFAULT_CONFIG.baseUrl,
    postsPerPage: Number(map.get("postsPerPage") ?? DEFAULT_CONFIG.postsPerPage) || DEFAULT_CONFIG.postsPerPage,
    rssEnabled: map.get("rssEnabled") !== "false",
    analyticsEnabled,
    googleAnalyticsMeasurementId,
    defaultSeoImage: map.get("defaultSeoImage") ?? null,
    language: readSettingOrEnv(map, "language", ["PUBLIC_SITE_LANGUAGE"]) ?? DEFAULT_CONFIG.language,
    locale: readSettingOrEnv(map, "locale", ["PUBLIC_SITE_LOCALE"]) ?? DEFAULT_CONFIG.locale,
    authorName: readSettingOrEnv(map, "authorName", ["PUBLIC_SITE_AUTHOR_NAME"]),
    publisherName: readSettingOrEnv(map, "publisherName", ["PUBLIC_SITE_PUBLISHER_NAME"]),
  };
}

export async function getBlogSetting(key: string): Promise<string | undefined> {
  const [row] = await db.select().from(blogSettings).where(eq(blogSettings.key, key)).limit(1);
  return row?.value;
}
