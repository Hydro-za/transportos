import { ResourceListPage } from "@/features/resource-pages";

export default function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <ResourceListPage resource="fuel" searchParams={searchParams} />;
}
