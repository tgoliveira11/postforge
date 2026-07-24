import Link from "next/link";
import type { BlogConfig } from "@/modules/public/blog-config";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PUBLIC_CONTENT_MAX_WIDTH_CLASS } from "./public-layout-constants";
import { SiteNav } from "./site-nav";

export function SiteHeader({ config }: { config: BlogConfig }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur">
      <div className={`mx-auto ${PUBLIC_CONTENT_MAX_WIDTH_CLASS} px-4 py-4 sm:px-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/"
            className="min-w-0 truncate text-lg font-semibold tracking-tight transition hover:text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] sm:max-w-[40%] sm:shrink-0 lg:max-w-none"
          >
            {config.title}
          </Link>

          <div className="flex min-w-0 items-center gap-3 sm:flex-1 sm:justify-end">
            <div className="-mx-2 min-w-0 flex-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SiteNav />
            </div>
            <ThemeToggle compact />
          </div>
        </div>
      </div>
    </header>
  );
}
