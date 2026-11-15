import { CollectionPage, collectionMetadata } from "../../components/collection-page";

export const dynamic = "force-dynamic";
export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }) => collectionMetadata("tr", (await params).slug);

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ durum?: string }> }) {
  return <CollectionPage locale="tr" slug={(await params).slug} durum={(await searchParams).durum} />;
}
