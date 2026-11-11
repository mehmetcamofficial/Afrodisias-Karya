import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { BlogManager } from "../BlogManager";

export default async function AdminBlog(){
  const access=await requireAdminPage("/admin/blog");if(access.status!=="admin")return <AdminForbidden email={access.user.email} configured={access.configured}/>;
  return <AdminShell kicker="BLOG & TARİF YÖNETİMİ" title="İçerik takvimi"><BlogManager/></AdminShell>
}
