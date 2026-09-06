import { requirePageUser } from "@/server/auth/session";
import { NotificationsPage } from "@/components/workspace/pages";
export default async function Page() { const user = await requirePageUser("/portal/notifications"); return <NotificationsPage user={user} area="portal" />; }
