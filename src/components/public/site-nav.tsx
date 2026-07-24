"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/blog", label: "Blog", match: (pathname: string) => pathname === "/blog" || pathname.startsWith("/blog/") },
  { href: "/tags", label: "Tags", match: (pathname: string) => pathname === "/tags" || pathname.startsWith("/tags/") },
  {
    href: "/categories",
    label: "Categories",
    match: (pathname: string) => pathname === "/categories" || pathname.startsWith("/categories/"),
  },
  { href: "/search", label: "Search", match: (pathname: string) => pathname === "/search" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation">
      <ul className="flex flex-nowrap gap-1 sm:gap-2">
        {NAV_LINKS.map((link) => {
          const isActive = link.match(pathname);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${
                  isActive
                    ? "bg-[var(--accent-muted)] text-[var(--primary)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
