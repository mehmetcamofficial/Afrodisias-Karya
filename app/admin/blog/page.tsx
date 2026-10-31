import { requireChatGPTUser } from "../../chatgpt-auth";
import { AdminShell } from "../../components/admin-shell";
import { BlogManager } from "../BlogManager";

export default async function AdminBlog(){
  await requireChatGPTUser("/admin/blog");
  return <AdminShell kicker="BLOG & TARİF YÖNETİMİ" title="İçerik takvimi"><BlogManager/></AdminShell>
}
