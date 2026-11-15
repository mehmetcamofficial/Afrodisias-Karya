import { requirePostgres } from "../../../db/postgres/driver";
import { listExperienceSections, type CmsExperienceSection } from "../../../db/postgres/showcase-repository";
import { adminEnvironment } from "../../../lib/admin-environment";
import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { AdminUnavailable } from "../AdminPanels";
import { ExperienceCms } from "../ShowcaseCms";

export const dynamic = "force-dynamic";

export default async function Page() {
  const access = await requireAdminPage("/admin/deneyim");
  if (access.status !== "admin") return <AdminForbidden email={access.user.email} configured={access.configured} />;
  let sections: CmsExperienceSection[] | null = null;
  try { sections = await listExperienceSections(requirePostgres(), { includeArchived: true }); } catch { sections = null; }
  return (
    <AdminShell kicker="DENEYİM CMS" title="Deneyim bölümleri">
      {sections ? <ExperienceCms initial={sections} role={access.role} publishingEnabled={adminEnvironment().publishing} /> : <AdminUnavailable what="Deneyim CMS" />}
    </AdminShell>
  );
}
