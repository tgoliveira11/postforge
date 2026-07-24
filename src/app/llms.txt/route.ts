import { getBlogConfig } from "@/modules/public/blog-config";
import {
  listPublicCategories,
  listPublicTags,
  listPublishedPostsForFeed,
} from "@/modules/public/public-posts.service";
import { buildLlmsTxt } from "@/modules/public/ai-discovery";

export async function GET() {
  const config = await getBlogConfig();
  const [posts, tags, categories] = await Promise.all([
    listPublishedPostsForFeed(500),
    listPublicTags(),
    listPublicCategories(),
  ]);

  return new Response(buildLlmsTxt({ config, posts, tags, categories }), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
