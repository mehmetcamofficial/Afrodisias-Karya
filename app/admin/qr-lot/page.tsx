import { requireAdminPage } from "../../admin-auth";
import { AdminForbidden } from "../../components/admin-forbidden";
import { AdminShell } from "../../components/admin-shell";
import { LotManager } from "../LotManager";
export default async function Page(){const access=await requireAdminPage("/admin/qr-lot");if(access.status!=="admin")return <AdminForbidden email={access.user.email} configured={access.configured}/>;return <AdminShell kicker="QR & LOT İZLENEBİLİRLİK" title="Hasattan şişeye kayıt"><LotManager/></AdminShell>}
