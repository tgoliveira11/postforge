import type { Metadata } from "next";
import type { BlogConfig } from "./blog-config";
import type { PublicPostBundle } from "./public-posts.repository";
import { findAssetById } from "./public-posts.repository";
import { publicPostPath } from "@/modules/posts/slug";

const DEFAULT_SEO_IMAGE_PATH = "/opengraph-image";
const LLMS_TXT_PATH = "/llms.txt";
const LLMS_FULL_TXT_PATH = "/llms-full.txt";

export type PostSeoInput = {
  bundle: PublicPostBundle;
  config: BlogConfig;
};

export type ResolvedPostSeo = {
  title: string;
  description: string;
  canonicalUrl: string;
  siteBaseUrl: string;
  siteTitle: string;
  authorName: string;
  publisherName: string;
  language: string;
  locale: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string | null;
  ogImageAlt: string | null;
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function absoluteUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function getSiteTitle(config: BlogConfig): string {
  return config.title;
}

function getSiteDescription(config: BlogConfig): string {
  return config.description;
}

function getAuthorName(config: BlogConfig): string {
  return config.authorName?.trim() || config.title;
}

function getPublisherName(config: BlogConfig): string {
  return config.publisherName?.trim() || config.title;
}

function getLanguage(config: BlogConfig): string {
  return config.language?.trim() || "en";
}

function getLocale(config: BlogConfig): string {
  return config.locale?.trim() || "en_US";
}

function getFallbackSeoImage(config: BlogConfig): string {
  return config.defaultSeoImage?.trim() || DEFAULT_SEO_IMAGE_PATH;
}

function buildPublicRobots(): Metadata["robots"] {
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  };
}

function buildPublicAlternateTypes(
  baseUrl: string,
  rssEnabled = true
): NonNullable<Metadata["alternates"]>["types"] {
  return {
    ...(rssEnabled ? { "application/rss+xml": `${baseUrl}/rss.xml` } : {}),
    "text/plain": [
      { title: "llms.txt", url: `${baseUrl}${LLMS_TXT_PATH}` },
      { title: "llms-full.txt", url: `${baseUrl}${LLMS_FULL_TXT_PATH}` },
    ],
  };
}

export function resolvePostSeo(input: PostSeoInput): ResolvedPostSeo {
  const { post } = input.bundle;
  const baseUrl = normalizeBaseUrl(input.config.baseUrl);

  const title = post.seoTitle?.trim() || post.title;
  const description = post.seoDescription?.trim() || post.excerpt?.trim() || getSiteDescription(input.config);
  const ogTitle = post.ogTitle?.trim() || title;
  const ogDescription = post.ogDescription?.trim() || description;
  const canonicalUrl = post.canonicalUrl?.trim() || `${baseUrl}${publicPostPath(post.slug)}`;

  return {
    title,
    description,
    canonicalUrl,
    siteBaseUrl: baseUrl,
    siteTitle: getSiteTitle(input.config),
    authorName: getAuthorName(input.config),
    publisherName: getPublisherName(input.config),
    language: getLanguage(input.config),
    locale: getLocale(input.config),
    ogTitle,
    ogDescription,
    ogImageUrl: null,
    ogImageAlt: null,
  };
}

export async function resolvePostSeoWithImages(input: PostSeoInput): Promise<ResolvedPostSeo> {
  const resolved = resolvePostSeo(input);
  const baseUrl = normalizeBaseUrl(input.config.baseUrl);

  const ogAssetId = input.bundle.post.ogAssetId ?? input.bundle.post.coverAssetId;
  let ogImageUrl: string | null = null;
  let ogImageAlt: string | null = null;

  if (ogAssetId) {
    const asset = await findAssetById(ogAssetId);
    if (asset?.publicUrl) {
      ogImageUrl = absoluteUrl(baseUrl, asset.publicUrl);
      ogImageAlt = asset.altText?.trim() || input.bundle.post.ogTitle?.trim() || input.bundle.post.title;
    }
  }

  if (!ogImageUrl) {
    ogImageUrl = absoluteUrl(baseUrl, getFallbackSeoImage(input.config));
    ogImageAlt = `${getSiteTitle(input.config)} social preview`;
  }

  return { ...resolved, ogImageUrl, ogImageAlt };
}

export function buildPublicAlternates(config: BlogConfig, canonical: string): Metadata["alternates"] {
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  return {
    canonical,
    types: buildPublicAlternateTypes(baseUrl, config.rssEnabled),
  };
}

export function buildPublicPageMetadata(
  config: BlogConfig,
  input: { title: string; description: string; canonicalPath: string }
): Metadata {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const title = input.title;
  const description = input.description;
  const image = getFallbackSeoImage(config);
  const canonicalUrl = `${baseUrl}${input.canonicalPath}`;

  return {
    title,
    description,
    metadataBase: new URL(config.baseUrl),
    alternates: buildPublicAlternates(config, input.canonicalPath),
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: getSiteTitle(config),
      locale: getLocale(config),
      images: [{ url: image, alt: `${getSiteTitle(config)} social preview` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: buildPublicRobots(),
  };
}

export function buildPostMetadata(
  resolved: ResolvedPostSeo,
  bundle?: PublicPostBundle
): Metadata {
  const authorUrl = `${resolved.siteBaseUrl}/`;
  const tagNames = bundle?.tags.map((tag) => tag.name);

  return {
    title: resolved.title,
    description: resolved.description,
    metadataBase: new URL(resolved.siteBaseUrl),
    authors: [{ name: resolved.authorName, url: authorUrl }],
    creator: resolved.authorName,
    publisher: resolved.publisherName,
    category: bundle?.category?.name,
    keywords: tagNames,
    alternates: {
      canonical: resolved.canonicalUrl,
      types: buildPublicAlternateTypes(resolved.siteBaseUrl),
    },
    openGraph: {
      title: resolved.ogTitle,
      description: resolved.ogDescription,
      type: "article",
      url: resolved.canonicalUrl,
      siteName: resolved.siteTitle,
      locale: resolved.locale,
      publishedTime: bundle?.post.publishedAt?.toISOString(),
      modifiedTime: bundle?.post.updatedAt.toISOString(),
      authors: [authorUrl],
      section: bundle?.category?.name,
      tags: tagNames,
      images: resolved.ogImageUrl
        ? [{ url: resolved.ogImageUrl, alt: resolved.ogImageAlt ?? resolved.ogTitle }]
        : undefined,
    },
    twitter: {
      card: resolved.ogImageUrl ? "summary_large_image" : "summary",
      title: resolved.ogTitle,
      description: resolved.ogDescription,
      images: resolved.ogImageUrl ? [resolved.ogImageUrl] : undefined,
    },
    robots: buildPublicRobots(),
  };
}

export function buildWebsiteJsonLd(config: BlogConfig): Record<string, unknown> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: getSiteTitle(config),
    description: getSiteDescription(config),
    url: baseUrl,
    publisher: {
      "@type": "Organization",
      name: getPublisherName(config),
      url: baseUrl,
    },
    inLanguage: getLanguage(config),
  };
}

export function buildBlogPostingJsonLd(
  bundle: PublicPostBundle,
  resolved: ResolvedPostSeo
): Record<string, unknown> {
  const author = {
    "@type": "Person",
    name: resolved.authorName,
    url: `${resolved.siteBaseUrl}/`,
  };
  const publisher = {
    "@type": "Organization",
    name: resolved.publisherName,
    url: resolved.siteBaseUrl,
  };

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${resolved.canonicalUrl}#article`,
    headline: resolved.title,
    description: resolved.description,
    datePublished: bundle.post.publishedAt?.toISOString(),
    dateModified: bundle.post.updatedAt.toISOString(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": resolved.canonicalUrl,
    },
    image: resolved.ogImageUrl ? [resolved.ogImageUrl] : undefined,
    url: resolved.canonicalUrl,
    author,
    publisher,
    keywords: bundle.tags.map((tag) => tag.name).join(", ") || undefined,
    articleSection: bundle.category?.name,
    timeRequired: bundle.post.readingTimeMinutes ? `PT${bundle.post.readingTimeMinutes}M` : undefined,
    inLanguage: resolved.language,
  };
}

export function buildArticleBreadcrumbJsonLd(
  bundle: PublicPostBundle,
  resolved: ResolvedPostSeo
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: resolved.siteTitle,
        item: `${resolved.siteBaseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: bundle.category?.name ?? "Blog",
        item: bundle.category
          ? `${resolved.siteBaseUrl}/categories/${bundle.category.slug}`
          : `${resolved.siteBaseUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: bundle.post.title,
        item: `${resolved.siteBaseUrl}${publicPostPath(bundle.post.slug)}`,
      },
    ],
  };
}

export function stringifyJsonLd(jsonLd: Record<string, unknown> | Record<string, unknown>[]): string {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export function buildSiteMetadata(config: BlogConfig): Metadata {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const title = getSiteTitle(config);
  const description = getSiteDescription(config);
  const image = getFallbackSeoImage(config);

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    metadataBase: new URL(config.baseUrl),
    alternates: buildPublicAlternates(config, "/"),
    openGraph: {
      title,
      description,
      type: "website",
      url: baseUrl,
      siteName: title,
      locale: getLocale(config),
      images: [{ url: image, alt: `${title} social preview` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: buildPublicRobots(),
  };
}
