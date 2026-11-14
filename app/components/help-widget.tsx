"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { whatsappLink, type ContactConfig } from "../../lib/contact-config";
import { faqs } from "../../lib/faq";

/**
 * Help button on every public page: FAQ, a consented contact form stored in
 * contact_inquiries, and user-initiated WhatsApp/e-mail when configured.
 * No automated messages are ever sent on the visitor's behalf.
 */
export function HelpWidget({ config }: { config: ContactConfig }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"faq" | "form">("faq");
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
      if (event.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, select, textarea, summary");
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname?.startsWith("/admin")) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true); setState(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), topic: data.get("topic"), message: data.get("message"), consent: data.get("consent") === "on", website: data.get("website") ?? "" }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.ok) { setState({ tone: "ok", text: "Mesajınız kaydedildi. En kısa sürede e-posta ile dönüş yapacağız." }); form.reset(); }
      else setState({ tone: "error", text: body.error ?? "Mesaj gönderilemedi." });
    } catch {
      setState({ tone: "error", text: "Bağlantı sorunu nedeniyle mesaj gönderilemedi; kaydedilmedi." });
    } finally { setSending(false); }
  };

  return (
    <>
      <button ref={triggerRef} type="button" className="help-fab" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen(true); setState(null); }}>
        <MessageCircle size={20} aria-hidden="true" /><span>Yardım</span>
      </button>
      {open && (
        <div className="help-backdrop" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>
          <div ref={panelRef} className="help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <div><small>ALTIN DAL</small><h2 id="help-title">Size nasıl yardımcı olabiliriz?</h2></div>
              <button ref={closeRef} type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label="Yardım penceresini kapat"><X size={18} /></button>
            </header>
            <div className="help-tabs" role="tablist" aria-label="Yardım seçenekleri">
              <button role="tab" type="button" aria-selected={tab === "faq"} onClick={() => setTab("faq")}>Sık sorulanlar</button>
              <button role="tab" type="button" aria-selected={tab === "form"} onClick={() => setTab("form")}>Bize yazın</button>
            </div>
            {tab === "faq" ? (
              <div className="help-faq" role="tabpanel">
                {faqs.map((item) => (
                  <details key={item.q}>
                    <summary>{item.q}</summary>
                    <p>{item.a}</p>
                    {item.link && <Link href={item.link.href} onClick={() => setOpen(false)}>{item.link.label} →</Link>}
                  </details>
                ))}
              </div>
            ) : (
              <form className="help-form" role="tabpanel" onSubmit={submit}>
                <label>Ad soyad<input name="name" required maxLength={120} autoComplete="name" /></label>
                <label>E-posta<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
                <label>Konu
                  <select name="topic" defaultValue="product">
                    <option value="product">Ürünler</option><option value="corporate">Kurumsal</option>
                    <option value="club">Olive Club</option><option value="order">Sipariş</option><option value="other">Diğer</option>
                  </select>
                </label>
                <label>Mesaj<textarea name="message" required minLength={5} maxLength={2000} rows={4} /></label>
                <label className="help-honeypot" aria-hidden="true">Web sitesi<input name="website" tabIndex={-1} autoComplete="off" /></label>
                <label className="help-consent"><input type="checkbox" name="consent" required /> Mesajıma yanıt verilmesi için adımın ve e-postamın saklanmasını kabul ediyorum.</label>
                <button type="submit" disabled={sending}><Send size={15} aria-hidden="true" /> {sending ? "Gönderiliyor…" : "Gönder"}</button>
                {state && <p className={`help-state is-${state.tone}`} role={state.tone === "error" ? "alert" : "status"}>{state.text}</p>}
              </form>
            )}
            {(config.whatsapp || config.email) && (
              <footer className="help-channels">
                {config.whatsapp && <a href={whatsappLink(config.whatsapp, "Merhaba, Altın Dal web sitesinden yazıyorum.")} target="_blank" rel="noopener noreferrer">WhatsApp ile yazın</a>}
                {config.email && <a href={`mailto:${config.email}`}>{config.email}</a>}
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  );
}
