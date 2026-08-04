import SettlementDetailView from "@/components/SettlementDetailView";

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SettlementDetailView id={id} />;
}
