import Link from "next/link";
import { PublicLayout } from "@/components/public/public-layout";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { PublicPageShell } from "@/components/public/public-page-shell";
import { PublicSectionHeading } from "@/components/public/public-section-heading";
import { PostList } from "@/components/public/post-list";
import { PublicEmptyState } from "@/components/public/public-empty-state";
import { SearchForm } from "@/components/public/search-form";
import { getBlogConfig } from "@/modules/public/blog-config";
import {
  listPublishedPostBundles,
  searchPublishedPostBundles,
} from "@/modules/public/public-posts.service";
import {
  formatSearchResultLabel,
  hasSearchQuery,
  normalizeSearchQuery,
} from "@/modules/public/search";
import { buildPublicPageMetadata } from "@/modules/public/seo";

export async function generateMetadata() {
  const config = await getBlogConfig();
  return buildPublicPageMetadata(config, {
    title: "Search",
    description: "Search published articles.",
    canonicalPath: "/search",
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = normalizeSearchQuery(params.q);
  const config = await getBlogConfig();
  const searching = hasSearchQuery(query);
  const [results, recentPosts] = await Promise.all([
    searching ? searchPublishedPostBundles(query) : Promise.resolve([]),
    searching ? Promise.resolve([]) : listPublishedPostBundles({ limit: 6 }),
  ]);

  return (
    <PublicLayout config={config}>
      <PublicPageShell>
        <PublicPageHero
          eyebrow="Discover"
          title="Search"
          description="Find published articles by keyword."
        >
          <SearchForm defaultQuery={query} variant="hero" />
        </PublicPageHero>

        {searching ? (
          <section aria-labelledby="search-results-heading">
            <h2 id="search-results-heading" className="sr-only">
              Search results
            </h2>
            <p className="mb-6 text-sm text-[var(--muted)]">
              {formatSearchResultLabel(results.length, query)}
            </p>
            {results.length > 0 ? (
              <PostList posts={results} />
            ) : (
              <PublicEmptyState
                title="No results found"
                description="Try a different keyword or browse the latest posts."
              >
                <Link
                  href="/blog"
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  Browse all posts
                </Link>
              </PublicEmptyState>
            )}
          </section>
        ) : (
          <section aria-labelledby="search-guidance-heading">
            <PublicEmptyState
              title="Start searching"
              description="Enter a keyword to search titles, excerpts, and article content."
            />
            {recentPosts.length > 0 ? (
              <div className="mt-10">
                <PublicSectionHeading
                  id="search-recent-heading"
                  title="Recent posts"
                  description="While you decide what to search for, here are the latest articles."
                  action={{ href: "/blog", label: "View all posts" }}
                />
                <PostList posts={recentPosts} layout="grid" variant="compact" />
              </div>
            ) : null}
          </section>
        )}
      </PublicPageShell>
    </PublicLayout>
  );
}
