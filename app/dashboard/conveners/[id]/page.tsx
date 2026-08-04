import ConvenerDetailView from "@/components/ConvenerDetailView";

export default async function ConvenerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConvenerDetailView id={id} />;
}
