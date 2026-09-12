import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import AdminClient from "./AdminClient";
export const dynamic="force-dynamic";
export default async function Admin(){const user=await requireChatGPTUser('/admin');return <main className="admin-page"><header><a href="/">← Mağazaya dön</a><div><span>{user.displayName}</span><a href={chatGPTSignOutPath('/')}>Çıkış</a></div></header><div className="admin-title"><p>ALTIN DAL · YÖNETİM</p><h1>Mağaza Yönetimi</h1></div><AdminClient/></main>}
