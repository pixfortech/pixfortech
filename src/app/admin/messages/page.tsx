import { requirePageUser } from "@/server/auth/session";
import { MessagesInbox } from "@/components/workspace/pages";
export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string }> }) { const user = await requirePageUser("/admin/messages"); const { c } = await searchParams; return <MessagesInbox user={user} area="admin" conversationId={c} />; }
