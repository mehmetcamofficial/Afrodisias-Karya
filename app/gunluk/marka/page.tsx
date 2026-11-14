import type { Metadata } from "next";
import { JournalCategoryPage } from "../../components/journal-category";
import { categoryIntros } from "../../../lib/blog";
export const metadata: Metadata = { title: "Marka Hikâyeleri — Altın Dal'ın Kökeni", description: categoryIntros["Marka Hikâyeleri"], alternates: { canonical: "/gunluk/marka" } };
export default function Page() { return <JournalCategoryPage category="Marka Hikâyeleri" />; }
