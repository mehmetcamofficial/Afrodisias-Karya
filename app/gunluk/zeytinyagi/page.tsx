import type { Metadata } from "next";
import { JournalCategoryPage } from "../../components/journal-category";
import { categoryIntros } from "../../../lib/blog";
export const metadata: Metadata = { title: "Zeytinyağı Rehberi — Seçme, Saklama ve Tadım", description: categoryIntros["Zeytinyağı Rehberi"], alternates: { canonical: "/gunluk/zeytinyagi" } };
export default function Page() { return <JournalCategoryPage category="Zeytinyağı Rehberi" />; }
