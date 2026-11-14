import type { Metadata } from "next";
import { JournalCategoryPage } from "../../components/journal-category";
import { categoryIntros } from "../../../lib/blog";
export const metadata: Metadata = { title: "Aphrodisias Tarihi — Mermer, Zanaat ve Peyzaj", description: categoryIntros["Aphrodisias Tarihi"], alternates: { canonical: "/gunluk/aphrodisias" } };
export default function Page() { return <JournalCategoryPage category="Aphrodisias Tarihi" />; }
