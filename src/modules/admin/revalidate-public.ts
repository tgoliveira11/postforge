import { revalidatePath } from "next/cache";
import { publicPostPath } from "@/modules/posts/slug";

export function revalidatePublicPaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/tags");
  revalidatePath("/categories");
  revalidatePath("/search");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
  revalidatePath("/llms-full.txt");

  if (slug) {
    revalidatePath(publicPostPath(slug));
  }
}
