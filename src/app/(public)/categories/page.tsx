import { PublicLayout } from "@/components/public/public-layout";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { PublicPageShell } from "@/components/public/public-page-shell";
import { CategoryList } from "@/components/public/category-list";
import { getBlogConfig } from "@/modules/public/blog-config";
import { listPublicCategories } from "@/modules/public/public-posts.service";
import { buildPublicPageMetadata } from "@/modules/public/seo";

export async function generateMetadata() {
  const config = await getBlogConfig();
  return buildPublicPageMetadata(config, {
    title: "Categories",
    description: "Browse posts by category.",
    canonicalPath: "/categories",
  });
}

export default async function CategoriesIndexPage() {
  const config = await getBlogConfig();
  const categories = await listPublicCategories();

  return (
    <PublicLayout config={config}>
      <PublicPageShell>
        <PublicPageHero
          eyebrow="Topics"
          title="Categories"
          description="Browse posts by category."
        />
        <section aria-labelledby="categories-list-heading">
          <h2 id="categories-list-heading" className="sr-only">
            All categories
          </h2>
          <CategoryList categories={categories} />
        </section>
      </PublicPageShell>
    </PublicLayout>
  );
}
