import { ResourceListPage } from "@/features/resource-pages";

export default function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <ResourceListPage resource="expenses" searchParams={searchParams} />;
}
