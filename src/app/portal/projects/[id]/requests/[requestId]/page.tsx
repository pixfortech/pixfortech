import { redirect } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ id: string; requestId: string }> }) {
  const { requestId } = await params;
  redirect(`/portal/requests/${requestId}`);
}
