import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/public/public-layout";
import { PublicBackLink } from "@/components/public/public-breadcrumbs";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { PublicPageShell } from "@/components/public/public-page-shell";
import { PostList } from "@/components/public/post-list";
import { getBlogConfig } from "@/modules/public/blog-config";
import { listPublishedPostBundlesByTagSlug } from "@/modules/public/public-posts.service";
import { buildPublicPageMetadata } from "@/modules/public/seo";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const result = await listPublishedPostBundlesByTagSlug(slug, { limit: 1 });
  if (!result) return { title: "Tag not found" };
  const config = await getBlogConfig();
  return buildPublicPageMetadata(config, {
    title: `Tag: ${result.tag.name}`,
    description: `Posts tagged with #${result.tag.name}.`,
    canonicalPath: `/tags/${result.tag.slug}`,
  });
}

export default async function TagDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await listPublishedPostBundlesByTagSlug(slug);
  if (!result) notFound();

  const config = await getBlogConfig();

  return (
    <PublicLayout config={config}>
      <PublicPageShell>
        <PublicBackLink href="/tags">All tags</PublicBackLink>
        <PublicPageHero
          eyebrow="Tag"
          title={`#${result.tag.name}`}
          description={`Posts tagged with #${result.tag.name}.`}
        />
        <section aria-labelledby="tag-posts-heading">
          <h2 id="tag-posts-heading" className="sr-only">
            Posts for #{result.tag.name}
          </h2>
          <PostList
            posts={result.posts}
            emptyMessage="No published posts for this tag yet."
          />
        </section>
      </PublicPageShell>
    </PublicLayout>
  );
}
