import { ResourceDetailPage } from "@/features/resource-pages";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  return <ResourceDetailPage resource="trailers" id={id} saved={saved} />;
}
