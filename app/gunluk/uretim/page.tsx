import type { Metadata } from "next";
import { JournalCategoryPage } from "../../components/journal-category";
import { categoryIntros } from "../../../lib/blog";
export const metadata: Metadata = { title: "Üretim — Sıkım, Dinlendirme ve Etiket Terimleri", description: categoryIntros["Üretim"], alternates: { canonical: "/gunluk/uretim" } };
export default function Page() { return <JournalCategoryPage category="Üretim" />; }
