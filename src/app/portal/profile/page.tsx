import { requirePageUser } from "@/server/auth/session";
import { ProfilePage } from "@/components/workspace/SettingsPage";
export default async function Page() { const user = await requirePageUser("/portal/profile"); return <ProfilePage user={user} area="portal" />; }
