"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

type Fields = { trName: string; trDescription: string; trSeoTitle: string; trSeoDescription: string; enName: string; enDescription: string; enSeoTitle: string; enSeoDescription: string; category: string; size: string };
type Issue = { field: string; severity: "error" | "warning" | "info"; message: string };
type Result = {
  label: string; ai: boolean; reason?: string; model?: string;
  apply?: Partial<Fields>; preview?: string;
  issues?: Issue[]; duplicates?: Array<{ id: string; score: number }>; missing?: string[];
};

/**
 * AI draft helper. Every result is shown for review first; "Forma uygula"
 * only fills the unsaved form. The human still saves, submits and publishes.
 */
export function AiAssist({ form, productId, onApply, disabled }: { form: Fields; productId?: string; onApply: (patch: Partial<Fields>) => void; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facts, setFacts] = useState("");

  const call = async (label: string, payload: unknown, toResult: (body: Record<string, unknown>) => Omit<Result, "label">) => {
    setBusy(true); setError(null); setResult(null);
    try {
      const response = await fetch("/api/admin/ai/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) { setError(String(body.error ?? `İstek başarısız (${response.status})`)); return; }
      setResult({ ...toResult(body), label });
    } catch { setError("Bağlantı sorunu; taslak üretilemedi."); } finally { setBusy(false); }
  };

  const tr = { name: form.trName, description: form.trDescription, seoTitle: form.trSeoTitle, seoDescription: form.trSeoDescription };
  const en = { name: form.enName, description: form.enDescription, seoTitle: form.enSeoTitle, seoDescription: form.enSeoDescription };
  type Draft = { description: string; seoTitle: string; seoDescription: string; missingFacts: string[] };
  type Translation = { name: string; description: string; seoTitle: string; seoDescription: string };

  return (
    <section className="cms-ai" aria-labelledby="cms-ai-title">
      <h3 id="cms-ai-title"><Sparkles size={16} aria-hidden="true" /> Yapay zekâ taslak yardımcısı</h3>
      <p className="cms-hint">Yalnızca taslak üretir: kaydetmez, fiyat/stok değiştirmez, yayımlamaz. Her öneriyi kontrol edin; uydurma bilgi görürseniz silin.</p>
      <label>Doğrulanmış bilgiler (yalnızca bunlar kullanılır)<textarea value={facts} onChange={(event) => setFacts(event.target.value)} rows={3} maxLength={6000} placeholder="Örn. Ataeymir'deki aile zeytinliğinden; Memecik çeşidi; erken hasat; soğuk sıkım." /></label>
      <div className="cms-actions">
        <button type="button" disabled={busy || disabled || !form.trName} onClick={() => call("TR açıklama + SEO taslağı",
          { task: "product_copy", locale: "tr", input: { name: form.trName, category: form.category, size: form.size, facts } },
          (body) => { const d = body.draft as Draft; return { ai: true, model: String(body.model), apply: { trDescription: d.description, trSeoTitle: d.seoTitle, trSeoDescription: d.seoDescription }, missing: d.missingFacts }; })}>TR açıklama taslağı</button>
        <button type="button" disabled={busy || disabled || !form.trName} onClick={() => call("TR → EN çeviri",
          { task: "translate", from: "tr", input: tr },
          (body) => { const d = body.draft as Translation; return { ai: true, model: String(body.model), apply: { enName: d.name, enDescription: d.description, enSeoTitle: d.seoTitle, enSeoDescription: d.seoDescription } }; })}>İngilizceye çevir</button>
        <button type="button" disabled={busy} onClick={() => call("Kalite ve kopya içerik kontrolü",
          { task: "quality_check", productId, input: { tr, en } },
          (body) => {
            const local = body.local as { issues: Issue[]; duplicates: Array<{ id: string; score: number }> } | null;
            const aiIssues = body.ai ? ((body.draft as { issues: Issue[] }).issues) : [];
            return { ai: Boolean(body.ai), reason: body.reason as string | undefined, model: body.model as string | undefined, issues: [...(local?.issues ?? []), ...aiIssues], duplicates: local?.duplicates ?? [] };
          })}>Kalite kontrolü</button>
      </div>
      {busy && <p role="status">Taslak hazırlanıyor…</p>}
      {error && <p className="cms-notice is-error" role="alert">{error}</p>}
      {result && (
        <div className="cms-ai-result" role="status">
          <small>{result.label} · {result.ai ? `AI (${result.model})` : `Yalnızca kural tabanlı kontrol — ${result.reason ?? "AI kapalı"}`}</small>
          {result.apply && <dl>{Object.entries(result.apply).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
          {result.missing && result.missing.length > 0 && <p><b>Eksik bilgi:</b> {result.missing.join("; ")}</p>}
          {result.issues && (result.issues.length ? <ul>{result.issues.map((issue, index) => <li key={index} className={`is-${issue.severity}`}><b>{issue.field}</b>: {issue.message}</li>)}</ul> : <p>Sorun bulunmadı.</p>)}
          {result.duplicates && result.duplicates.length > 0 && <p><b>Benzer açıklama:</b> {result.duplicates.map((d) => `${d.id} (%${Math.round(d.score * 100)})`).join(", ")}</p>}
          {result.apply && !disabled && <button type="button" className="cms-primary" onClick={() => { onApply(result.apply!); setResult(null); }}>Forma uygula (kaydedilmez)</button>}
        </div>
      )}
    </section>
  );
}
