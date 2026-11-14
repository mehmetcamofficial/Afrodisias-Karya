import type { Metadata } from "next";
import { JournalCategoryPage } from "../../components/journal-category";
import { categoryIntros } from "../../../lib/blog";
export const metadata: Metadata = { title: "Hasat Günlükleri — Ataeymir'den Sezon Notları", description: categoryIntros["Hasat Günlükleri"], alternates: { canonical: "/gunluk/hasat" } };
export default function Page() { return <JournalCategoryPage category="Hasat Günlükleri" />; }
