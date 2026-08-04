import DisputeDetailView from "@/components/DisputeDetailView";

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DisputeDetailView id={id} />;
}
