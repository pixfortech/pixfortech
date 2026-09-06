import { requirePageUser } from "@/server/auth/session";
import { RequestPage } from "@/components/workspace/pages";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/portal/requests/${id}`);
  return <RequestPage user={user} id={id} area="portal" />;
}
