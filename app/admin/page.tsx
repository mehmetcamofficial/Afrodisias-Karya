import { requirePostgres } from "../../db/postgres/driver";
import { listProducts, listOrders } from "../../db/postgres/repository";
import { requireAdminPage } from "../admin-auth";
import { AdminForbidden } from "../components/admin-forbidden";
import AdminClient from "./AdminClient";
import type { AdminOrder, AdminProduct } from "./AdminClient";
import { AdminShell } from "../components/admin-shell";
import { products as catalogue } from "../../lib/products";
export const dynamic="force-dynamic";
export default async function Admin(){
 const access=await requireAdminPage('/admin');
 if(access.status!=="admin")return <AdminForbidden email={access.user.email} configured={access.configured}/>;
 const [productRows,orderRows]=await Promise.all([listProducts(requirePostgres()),listOrders(requirePostgres())]);
 const initialProducts=productRows.length?productRows:catalogue.map(product=>({id:product.id,name:product.name,type:product.category,size:product.size,note:product.note,priceKurus:(product.prices.TRY??0)*100,stock:product.stock}));
 return <AdminShell kicker="ALTIN DAL · YÖNETİM" title="Mağaza Yönetimi"><AdminClient initialProducts={initialProducts as AdminProduct[]} initialOrders={orderRows as AdminOrder[]}/></AdminShell>
}
