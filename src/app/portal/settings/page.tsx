import { requirePageUser } from "@/server/auth/session";
import { SettingsPage } from "@/components/workspace/SettingsPage";
export default async function Page() { const user = await requirePageUser("/portal/settings"); return <SettingsPage user={user} area="portal" />; }
