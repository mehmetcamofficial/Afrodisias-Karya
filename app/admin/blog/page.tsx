import { listBlogPosts, type CmsBlogPost } from "../../../db/postgres/blog-repository";
import { requirePostgres } from "../../../db/postgres/driver";
import { adminEnvironment } from "../../../lib/admin-environment";
import { blogCategories, blogPosts } from "../../../lib/blog";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { AdminUnavailable } from "../AdminPanels";
import { BlogCms } from "../BlogCms";
import { BlogManager } from "../BlogManager";

export const dynamic = "force-dynamic";

export default async function AdminBlog() {
  const access = await requireAdminPage("/admin/blog");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  let posts: CmsBlogPost[] | null = null;
  try { posts = await listBlogPosts(requirePostgres()); } catch { posts = null; }
  return (
    <AdminShell kicker="GÜNLÜK · İÇERİK YÖNETİMİ" title="Yazılar ve taslaklar">
      {posts
        ? <BlogCms initialPosts={posts} role={access.role} publishingEnabled={adminEnvironment().publishing} categories={blogCategories}
            codeDrafts={blogPosts.filter((post) => post.status === "draft").map((post) => ({ slug: post.slug, title: post.title }))} />
        : <AdminUnavailable what="Blog CMS" />}
      <h2 className="admin-section-title">Kod tabanlı yazılar (salt okunur)</h2>
      <BlogManager />
    </AdminShell>
  );
}
