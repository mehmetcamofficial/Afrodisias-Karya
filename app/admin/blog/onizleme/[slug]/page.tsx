import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnyPost, readMinutes } from "../../../../../lib/blog";
import { requireAdminPage } from "../../../../admin-auth";
import { AdminForbidden } from "../../../../components/admin-forbidden";
import { AdminShell } from "../../../../components/admin-shell";
import { ArticleBody } from "../../../../components/journal-card";

export const dynamic = "force-dynamic";
// Draft previews must never be indexed.
export const metadata = { robots: { index: false, follow: false } };

/** Admin-only draft preview. Drafts have no public route. */
export default async function DraftPreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await requireAdminPage("/admin/blog");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  const post = getAnyPost(slug);
  if (!post) notFound();
  return (
    <AdminShell kicker={post.status === "draft" ? "TASLAK ÖNİZLEME · YAYINDA DEĞİL" : "YAYINDAKİ YAZI"} title={post.title}>
      <div className="admin-notice" role="note">
        {post.status === "draft"
          ? "Bu yazı taslaktır; sitede görünmez, arama motorlarına kapalıdır ve otomatik yayımlanmaz."
          : <>Bu yazı yayındadır: <Link href={`/gunluk/${post.slug}`}>/gunluk/{post.slug}</Link></>}
      </div>
      <article className="admin-card wide admin-preview article-body">
        <p className="eyebrow">{post.category} · {readMinutes(post)} dk · {post.author}</p>
        <p className="article-lead">{post.excerpt}</p>
        <ArticleBody blocks={post.body} />
        {post.reviewNotes?.length ? (
          <aside className="admin-review-notes"><b>Yayın öncesi doğrulanacaklar</b><ul>{post.reviewNotes.map((note) => <li key={note}>{note}</li>)}</ul></aside>
        ) : null}
        <Link href="/admin/blog">← Günlük yönetimine dön</Link>
      </article>
    </AdminShell>
  );
}
