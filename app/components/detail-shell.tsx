"use client";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";

const links=[['Zeytinliğimiz','/our-grove'],['Hasat','/harvest'],['Hikâyemiz','/our-story'],['Olive Club','/olive-club'],['İzlenebilirlik','/traceability/26-004'],['Kurumsal','/corporate-gifts']];
export function SiteHeader(){const[open,setOpen]=useState(false);return <header className="detail-nav"><a className="wordmark" href="/"><span>AD</span><b>ALTIN DAL<small>APHRODISIAS ESTATE</small></b></a><nav className={open?'open':''}>{links.map(([label,href])=><a key={href} href={href}>{label}</a>)}</nav><div><a href="/#collection" aria-label="Mağazaya git"><ShoppingBag size={19}/></a><button onClick={()=>setOpen(!open)} aria-label="Menüyü aç">{open?<X/>:<Menu/>}</button></div></header>}
export function SiteFooter(){return <footer className="detail-footer"><div className="wordmark"><span>AD</span><b>ALTIN DAL<small>APHRODISIAS ESTATE</small></b></div><div>{links.map(([label,href])=><a key={href} href={href}>{label}</a>)}</div><p>Karacasu · Ataeymir · Aydın<br/>© 2026 Altın Dal</p></footer>}
export function DetailHero({chapter,kicker,title,lead,image,children}:{chapter:string;kicker:string;title:string;lead:string;image:string;children?:React.ReactNode}){return <section className="detail-hero"><img src={image} alt=""/><div className="detail-hero-shade"/><div className="detail-hero-copy"><span>{chapter}</span><p className="kicker">{kicker}</p><h1>{title}</h1><p>{lead}</p>{children}</div></section>}
export function DetailShell({children}:{children:React.ReactNode}){return <><SiteHeader/><main className="detail-main">{children}</main><SiteFooter/></>}
