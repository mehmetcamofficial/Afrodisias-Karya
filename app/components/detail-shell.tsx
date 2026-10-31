"use client";
import Link from "next/link";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";

const links=[['Hikâyemiz','/hikayemiz'],['Hasat','/hasat'],['Günlük','/gunluk'],['Koleksiyon','/koleksiyon'],['Deneyim','/deneyim'],['Mağaza','/magaza']];
export function SiteHeader(){const[open,setOpen]=useState(false);return <header className="detail-nav"><Link className="wordmark" href="/"><span>AD</span><b>ALTIN DAL<small>APHRODISIAS ESTATE</small></b></Link><nav className={open?'open':''}>{links.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav><div><Link href="/magaza" aria-label="Mağazaya git"><ShoppingBag size={19}/></Link><button onClick={()=>setOpen(!open)} aria-label="Menüyü aç">{open?<X/>:<Menu/>}</button></div></header>}
export function SiteFooter(){return <footer className="detail-footer"><div className="wordmark"><span>AD</span><b>ALTIN DAL<small>APHRODISIAS ESTATE</small></b></div><div>{links.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</div><p>Karacasu · Ataeymir · Aydın<br/>© 2026 Altın Dal</p></footer>}
export function DetailHero({chapter,kicker,title,lead,image,video,children}:{chapter:string;kicker:string;title:string;lead:string;image:string;video?:string;children?:React.ReactNode}){return <section className="detail-hero"><img src={image} alt=""/>{video&&<video className="detail-hero-video" autoPlay muted loop playsInline preload="metadata" poster={image} aria-label={title}><source src={video} type="video/mp4"/></video>}<div className="detail-hero-shade"/><div className="detail-hero-copy"><span>{chapter}</span><p className="kicker">{kicker}</p><h1>{title}</h1><p>{lead}</p>{children}</div></section>}
export function DetailShell({children}:{children:React.ReactNode}){return <><SiteHeader/><main className="detail-main">{children}</main><SiteFooter/></>}
