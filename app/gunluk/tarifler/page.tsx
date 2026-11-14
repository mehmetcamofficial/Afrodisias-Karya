import type { Metadata } from "next";
import { JournalCategoryPage } from "../../components/journal-category";
import { categoryIntros } from "../../../lib/blog";
export const metadata: Metadata = { title: "Ege Mutfağından Zeytinyağlı Tarifler", description: categoryIntros["Ege Mutfağından Tarifler"], alternates: { canonical: "/gunluk/tarifler" } };
export default function Page() { return <JournalCategoryPage category="Ege Mutfağından Tarifler" />; }
