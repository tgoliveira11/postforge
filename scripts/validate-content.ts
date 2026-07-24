import { pathToFileURL } from "node:url";
import { load } from "cheerio";
import type { Root } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { db, closeDb } from "@/db/get-db";
import { assets } from "@/modules/assets/assets.schema";
import type { Asset } from "@/modules/assets/assets.types";
import { categories } from "@/modules/categories/categories.schema";
import type { Category } from "@/modules/categories/categories.types";
import { posts, postTags } from "@/modules/posts/posts.schema";
import type { Post } from "@/modules/posts/posts.types";
import { isValidSlug, publicPostPath } from "@/modules/posts/slug";
import { redirects } from "@/modules/redirects/redirects.schema";
import type { Redirect } from "@/modules/redirects/redirects.types";
import { tags } from "@/modules/tags/tags.schema";
import type { Tag } from "@/modules/tags/tags.types";
import { loadEnvFiles } from "@/lib/load-env";

export type ContentIssueLevel = "error" | "warning";

export type ContentIssue = {
  level: ContentIssueLevel;
  message: string;
  post?: string;
};

export type ContentValidationRows = {
  posts: Post[];
  categories: Category[];
  tags: Tag[];
  postTags: Array<{ postId: string; tagId: string }>;
  assets: Asset[];
  redirects: Redirect[];
};

export type ContentValidationResult = {
  checked: {
    posts: number;
    categories: number;
    tags: number;
    assets: number;
    redirects: number;
  };
  issues: ContentIssue[];
};

const STATIC_PUBLIC_PATHS = new Set([
  "/",
  "/blog",
  "/categories",
  "/llms-full.txt",
  "/llms.txt",
  "/opengraph-image",
  "/rss.xml",
  "/search",
  "/sitemap.xml",
  "/tags",
]);

const VALID_REDIRECT_STATUS_CODES = new Set([301, 302, 307, 308]);

type MdastNode = {
  type?: string;
  url?: unknown;
  alt?: unknown;
  value?: unknown;
  children?: MdastNode[];
};

const markdownParser = unified().use(remarkParse);

function addIssue(
  issues: ContentIssue[],
  level: ContentIssueLevel,
  message: string,
  post?: string
) {
  issues.push({ level, message, post });
}

function normalizePath(path: string): string {
  const withoutHash = path.split("#")[0] ?? path;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  return withoutQuery.replace(/\/$/, "") || "/";
}

function normalizeInternalPath(href: string, baseUrl: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  if (/^(mailto:|tel:|sms:|javascript:)/i.test(trimmed)) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.origin !== baseUrl) {
        return null;
      }
      return normalizePath(url.pathname);
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("//")) {
    return null;
  }

  return normalizePath(trimmed.startsWith("/") ? trimmed : `/${trimmed.replace(/^\.\//, "")}`);
}

function slugDatePrefix(slug: string): string | null {
  return /^\d{4}-\d{2}-\d{2}/.exec(slug)?.[0] ?? null;
}

function isValidCanonicalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function collectHtmlReferences(
  html: string,
  links: Set<string>,
  imageAltIssues: string[]
): void {
  const $ = load(html);

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (href) links.add(href);
  });

  $("img[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (src) links.add(src);
    if (!$(element).attr("alt")?.trim()) {
      imageAltIssues.push(src ? `Image ${src} is missing alt text.` : "HTML image is missing alt text.");
    }
  });
}

export function extractContentReferences(markdown: string): {
  links: string[];
  imageAltIssues: string[];
} {
  const links = new Set<string>();
  const imageAltIssues: string[] = [];
  const tree = markdownParser.parse(markdown) as Root;

  function visit(node: MdastNode) {
    if ((node.type === "link" || node.type === "definition") && typeof node.url === "string") {
      links.add(node.url);
    }

    if (node.type === "image" && typeof node.url === "string") {
      links.add(node.url);
      if (typeof node.alt !== "string" || !node.alt.trim()) {
        imageAltIssues.push(`Markdown image ${node.url} is missing alt text.`);
      }
    }

    if (node.type === "html" && typeof node.value === "string") {
      collectHtmlReferences(node.value, links, imageAltIssues);
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  }

  visit(tree as MdastNode);

  return {
    links: [...links],
    imageAltIssues,
  };
}

function postLabel(post: Post): string {
  return `${post.title} (${post.slug})`;
}

function buildValidInternalPaths(rows: ContentValidationRows, baseUrl: string): Set<string> {
  const now = new Date();
  const publishedPosts = rows.posts.filter(
    (post) => post.status === "published" && post.publishedAt && post.publishedAt <= now
  );
  const publicCategoryIds = new Set(publishedPosts.map((post) => post.categoryId).filter(Boolean));
  const publishedPostIds = new Set(publishedPosts.map((post) => post.id));
  const publicTagIds = new Set(
    rows.postTags
      .filter((row) => publishedPostIds.has(row.postId))
      .map((row) => row.tagId)
  );
  const paths = new Set<string>(STATIC_PUBLIC_PATHS);

  for (const post of publishedPosts) {
    paths.add(publicPostPath(post.slug));
  }

  for (const category of rows.categories) {
    if (publicCategoryIds.has(category.id)) {
      paths.add(`/categories/${category.slug}`);
    }
  }

  for (const tag of rows.tags) {
    if (publicTagIds.has(tag.id)) {
      paths.add(`/tags/${tag.slug}`);
    }
  }

  for (const asset of rows.assets) {
    const normalized = normalizeInternalPath(asset.publicUrl, baseUrl);
    if (normalized) {
      paths.add(normalized);
    }
  }

  return paths;
}

function validatePost(
  post: Post,
  rows: ContentValidationRows,
  baseUrl: string,
  validInternalPaths: Set<string>,
  issues: ContentIssue[]
) {
  const label = postLabel(post);
  const categoriesById = new Map(rows.categories.map((category) => [category.id, category]));
  const tagsById = new Map(rows.tags.map((tag) => [tag.id, tag]));
  const assetsById = new Map(rows.assets.map((asset) => [asset.id, asset]));
  const now = new Date();
  const isPublished = post.status === "published";

  if (!isValidSlug(post.slug)) {
    addIssue(issues, "error", `Invalid post slug "${post.slug}".`, label);
  }

  if (isPublished) {
    if (!post.publishedAt) {
      addIssue(issues, "error", "Published post is missing publishedAt.", label);
    } else if (post.publishedAt > now) {
      addIssue(issues, "error", "Published post has a future publishedAt date.", label);
    }

    if (!post.excerpt?.trim() && !post.seoDescription?.trim()) {
      addIssue(issues, "error", "Published post is missing an excerpt or SEO description.", label);
    }

    if (!post.contentMarkdown.trim()) {
      addIssue(issues, "error", "Published post has an empty body.", label);
    }

    if (!post.categoryId) {
      addIssue(issues, "warning", "Published post has no category.", label);
    }
  }

  if (post.categoryId && !categoriesById.has(post.categoryId)) {
    addIssue(issues, "error", `Category ${post.categoryId} does not exist.`, label);
  }

  const postTagRows = rows.postTags.filter((row) => row.postId === post.id);
  const seenTagIds = new Set<string>();
  for (const row of postTagRows) {
    if (!tagsById.has(row.tagId)) {
      addIssue(issues, "error", `Tag ${row.tagId} does not exist.`, label);
    }
    if (seenTagIds.has(row.tagId)) {
      addIssue(issues, "error", `Duplicate tag link ${row.tagId}.`, label);
    }
    seenTagIds.add(row.tagId);
  }

  for (const [field, assetId] of [
    ["cover asset", post.coverAssetId],
    ["Open Graph asset", post.ogAssetId],
  ] as const) {
    if (!assetId) continue;
    const asset = assetsById.get(assetId);
    if (!asset) {
      addIssue(issues, "error", `${field} ${assetId} does not exist.`, label);
      continue;
    }
    if (!asset.publicUrl.trim()) {
      addIssue(issues, "error", `${field} ${assetId} is missing publicUrl.`, label);
    }
    if (isPublished && field === "cover asset" && !asset.altText?.trim()) {
      addIssue(issues, "warning", `Cover asset ${assetId} is missing alt text.`, label);
    }
  }

  if (post.publishedAt) {
    const datePrefix = slugDatePrefix(post.slug);
    const publishedDate = post.publishedAt.toISOString().slice(0, 10);
    if (datePrefix && datePrefix !== publishedDate) {
      addIssue(
        issues,
        "warning",
        `Slug date ${datePrefix} differs from publishedAt date ${publishedDate}.`,
        label
      );
    }
  }

  if (isPublished) {
    const references = extractContentReferences(post.contentMarkdown);

    for (const issue of references.imageAltIssues) {
      addIssue(issues, "warning", issue, label);
    }

    for (const href of references.links) {
      const normalized = normalizeInternalPath(href, baseUrl);
      if (normalized && !validInternalPaths.has(normalized)) {
        addIssue(issues, "error", `Broken or non-public internal reference: ${href}`, label);
      }
    }
  }
}

export function validateContentRows(
  rows: ContentValidationRows,
  options: { baseUrl: string }
): ContentValidationResult {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const issues: ContentIssue[] = [];
  const canonicalUrls = new Map<string, string>();
  const validInternalPaths = buildValidInternalPaths(rows, baseUrl);
  const postIds = new Set(rows.posts.map((post) => post.id));

  for (const row of rows.postTags) {
    if (!postIds.has(row.postId)) {
      addIssue(issues, "error", `Post tag row references missing post ${row.postId}.`);
    }
  }

  for (const post of rows.posts) {
    const canonicalUrl = post.canonicalUrl?.trim() || `${baseUrl}${publicPostPath(post.slug)}`;
    const label = postLabel(post);
    if (!isValidCanonicalUrl(canonicalUrl)) {
      addIssue(issues, "error", `Invalid canonical URL "${canonicalUrl}".`, label);
    }

    const existingCanonical = canonicalUrls.get(canonicalUrl);
    if (existingCanonical) {
      addIssue(
        issues,
        "error",
        `Duplicate canonical URL "${canonicalUrl}" also used by ${existingCanonical}.`,
        label
      );
    } else {
      canonicalUrls.set(canonicalUrl, label);
    }

    validatePost(post, rows, baseUrl, validInternalPaths, issues);
  }

  for (const redirect of rows.redirects) {
    if (!redirect.sourcePath.startsWith("/")) {
      addIssue(issues, "error", `Redirect source must start with "/": ${redirect.sourcePath}.`);
    }
    if (!redirect.targetPath.startsWith("/") && !isValidCanonicalUrl(redirect.targetPath)) {
      addIssue(issues, "error", `Redirect target must be an internal path or URL: ${redirect.targetPath}.`);
    }
    if (redirect.sourcePath === redirect.targetPath) {
      addIssue(issues, "error", `Redirect loops to itself: ${redirect.sourcePath}.`);
    }
    if (!VALID_REDIRECT_STATUS_CODES.has(redirect.statusCode)) {
      addIssue(issues, "error", `Redirect ${redirect.sourcePath} has invalid status ${redirect.statusCode}.`);
    }

    const normalizedTarget = normalizeInternalPath(redirect.targetPath, baseUrl);
    if (normalizedTarget && !validInternalPaths.has(normalizedTarget)) {
      addIssue(
        issues,
        "warning",
        `Redirect ${redirect.sourcePath} points to a non-public target: ${redirect.targetPath}.`
      );
    }
  }

  return {
    checked: {
      posts: rows.posts.length,
      categories: rows.categories.length,
      tags: rows.tags.length,
      assets: rows.assets.length,
      redirects: rows.redirects.length,
    },
    issues,
  };
}

function printResult(result: ContentValidationResult): void {
  const errors = result.issues.filter((issue) => issue.level === "error");
  const warnings = result.issues.filter((issue) => issue.level === "warning");

  console.log(
    `Content validation checked ${result.checked.posts} posts, ${result.checked.categories} categories, ${result.checked.tags} tags, ${result.checked.assets} assets, ${result.checked.redirects} redirects.`
  );

  for (const issue of result.issues) {
    const prefix = issue.level === "error" ? "ERROR" : "WARN";
    console.log(`${prefix}: ${issue.post ? `${issue.post}: ` : ""}${issue.message}`);
  }

  console.log(`Content validation result: ${errors.length} errors, ${warnings.length} warnings.`);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

export async function main(): Promise<void> {
  loadEnvFiles();

  if (!process.env.DATABASE_URL) {
    console.log("Content validation skipped: DATABASE_URL is not set.");
    return;
  }

  const [postRows, categoryRows, tagRows, postTagRows, assetRows, redirectRows] =
    await Promise.all([
      db.select().from(posts),
      db.select().from(categories),
      db.select().from(tags),
      db.select().from(postTags),
      db.select().from(assets),
      db.select().from(redirects),
    ]);

  const result = validateContentRows(
    {
      posts: postRows,
      categories: categoryRows,
      tags: tagRows,
      postTags: postTagRows,
      assets: assetRows,
      redirects: redirectRows,
    },
    {
      baseUrl: process.env.APP_BASE_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000",
    }
  );

  printResult(result);
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectRun) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDb();
    });
}
