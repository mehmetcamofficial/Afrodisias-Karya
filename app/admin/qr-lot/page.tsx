import { requireChatGPTUser } from "../../chatgpt-auth";
import { AdminShell } from "../../components/admin-shell";
import { LotManager } from "../LotManager";
export default async function Page(){await requireChatGPTUser("/admin/qr-lot");return <AdminShell kicker="QR & LOT İZLENEBİLİRLİK" title="Hasattan şişeye kayıt"><LotManager/></AdminShell>}
