import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/public/public-layout";
import { PublicBackLink } from "@/components/public/public-breadcrumbs";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { PublicPageShell } from "@/components/public/public-page-shell";
import { PostList } from "@/components/public/post-list";
import { getBlogConfig } from "@/modules/public/blog-config";
import { listPublishedPostBundlesByCategorySlug } from "@/modules/public/public-posts.service";
import { buildPublicPageMetadata } from "@/modules/public/seo";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const result = await listPublishedPostBundlesByCategorySlug(slug, { limit: 1 });
  if (!result) return { title: "Category not found" };
  const config = await getBlogConfig();
  return buildPublicPageMetadata(config, {
    title: `Category: ${result.category.name}`,
    description: result.category.description ?? `Posts in ${result.category.name}.`,
    canonicalPath: `/categories/${result.category.slug}`,
  });
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await listPublishedPostBundlesByCategorySlug(slug);
  if (!result) notFound();

  const config = await getBlogConfig();

  return (
    <PublicLayout config={config}>
      <PublicPageShell>
        <PublicBackLink href="/categories">All categories</PublicBackLink>
        <PublicPageHero
          eyebrow="Category"
          title={result.category.name}
          description={
            result.category.description ?? `Published posts in ${result.category.name}.`
          }
        />
        <section aria-labelledby="category-posts-heading">
          <h2 id="category-posts-heading" className="sr-only">
            Posts in {result.category.name}
          </h2>
          <PostList
            posts={result.posts}
            emptyMessage="No published posts in this category yet."
          />
        </section>
      </PublicPageShell>
    </PublicLayout>
  );
}
