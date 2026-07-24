import { BlogListingSummary } from "@/components/public/blog-listing-summary";
import { PublicLayout } from "@/components/public/public-layout";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { PublicPageShell } from "@/components/public/public-page-shell";
import { PostList } from "@/components/public/post-list";
import { PublicPagination } from "@/components/public/public-pagination";
import { SearchForm } from "@/components/public/search-form";
import { normalizePage } from "@/lib/pagination";
import { getBlogListingPage } from "@/modules/public/public-posts.service";
import { getBlogConfig } from "@/modules/public/blog-config";
import { buildPublicPageMetadata } from "@/modules/public/seo";

export async function generateMetadata() {
  const config = await getBlogConfig();
  return buildPublicPageMetadata(config, {
    title: "Blog",
    description: "Browse all published posts.",
    canonicalPath: "/blog",
  });
}

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = normalizePage(params.page);
  const { config, posts, totalPages, total } = await getBlogListingPage(page);

  return (
    <PublicLayout config={config}>
      <PublicPageShell>
        <PublicPageHero
          eyebrow="Archive"
          title="Blog"
          description="Browse all published posts."
        >
          <SearchForm variant="hero" />
        </PublicPageHero>

        <section aria-labelledby="blog-posts-heading">
          <h2 id="blog-posts-heading" className="sr-only">
            All posts
          </h2>
          <BlogListingSummary totalPublishedPosts={total} />
          <PostList
            posts={posts}
            emptyMessage="Published posts will appear here once they are available."
          />
          <PublicPagination basePath="/blog" page={page} totalPages={totalPages} />
        </section>
      </PublicPageShell>
    </PublicLayout>
  );
}
