import { describe, expect, it } from "vitest";
import { adminNavItems, isAdminNavItemActive } from "@/modules/admin/admin-navigation";
import { SECURE_AUTH_ADMIN_PATHS } from "@/modules/admin/secure-auth-admin-paths";

describe("admin navigation", () => {
  it("links account, security, and sessions to canonical /admin routes", () => {
    const hrefs = adminNavItems.map((item) => item.href);
    expect(hrefs).toContain(SECURE_AUTH_ADMIN_PATHS.account);
    expect(hrefs).toContain(SECURE_AUTH_ADMIN_PATHS.security);
    expect(hrefs).toContain(SECURE_AUTH_ADMIN_PATHS.sessions);
    expect(hrefs).not.toContain("/settings/account");
    expect(hrefs).not.toContain("/settings/security");
  });

  it("highlights account and security routes independently", () => {
    expect(isAdminNavItemActive("/admin/account", { href: "/admin/account", label: "Account" })).toBe(
      true
    );
    expect(isAdminNavItemActive("/admin/security", { href: "/admin/security", label: "Security" })).toBe(
      true
    );
    expect(isAdminNavItemActive("/admin/sessions", { href: "/admin/sessions", label: "Sessions" })).toBe(
      true
    );
    expect(isAdminNavItemActive("/admin/security", { href: "/admin/account", label: "Account" })).toBe(
      false
    );
  });

  it("never highlights external nav items", () => {
    const publicBlog = { href: "/", label: "Public Blog", external: true };
    expect(isAdminNavItemActive("/", publicBlog)).toBe(false);
    expect(isAdminNavItemActive("/blog", publicBlog)).toBe(false);
  });

  it("highlights dashboard only on exact /admin path", () => {
    const dashboard = { href: "/admin", label: "Dashboard" };
    expect(isAdminNavItemActive("/admin", dashboard)).toBe(true);
    expect(isAdminNavItemActive("/admin/posts", dashboard)).toBe(false);
  });

  it("highlights posts list and edit routes but not new post", () => {
    const postsItem = { href: "/admin/posts", label: "Posts" };
    expect(isAdminNavItemActive("/admin/posts", postsItem)).toBe(true);
    expect(isAdminNavItemActive("/admin/posts/abc/edit", postsItem)).toBe(true);
    expect(isAdminNavItemActive("/admin/posts/new", postsItem)).toBe(false);
  });
});

describe("secure-auth admin paths", () => {
  it("defines canonical admin settings routes", () => {
    expect(SECURE_AUTH_ADMIN_PATHS.account).toBe("/admin/account");
    expect(SECURE_AUTH_ADMIN_PATHS.security).toBe("/admin/security");
    expect(SECURE_AUTH_ADMIN_PATHS.sessions).toBe("/admin/sessions");
  });
});
