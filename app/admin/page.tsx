import { requirePostgres } from "../../db/postgres/driver";
import { listAllProducts, listOrders } from "../../db/postgres/repository";
import { requireAdminPage } from "../admin-auth";
import { AdminForbidden } from "../components/admin-forbidden";
import AdminClient from "./AdminClient";
import type { AdminOrder, AdminProduct } from "./AdminClient";
import { AdminShell } from "../components/admin-shell";
export const dynamic="force-dynamic";
export default async function Admin(){
 const access=await requireAdminPage('/admin');
 if(access.status!=="admin")return <AdminForbidden email={access.user.email} configured={access.configured}/>;
 const [productRows,orderRows]=await Promise.all([listAllProducts(requirePostgres()),listOrders(requirePostgres())]);
 const initialProducts=productRows;
 return <AdminShell kicker="ALTIN DAL · YÖNETİM" title="Mağaza Yönetimi"><AdminClient initialProducts={initialProducts as AdminProduct[]} initialOrders={orderRows as AdminOrder[]} canPublish={process.env.VERCEL_ENV === "preview" && process.env.PREVIEW_CATALOG_PUBLISH_ENABLED === "true"}/></AdminShell>
}
