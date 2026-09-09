import { requirePageUser } from "@/server/auth/session";
import { ProfilePage } from "@/components/workspace/SettingsPage";
export default async function Page() { const user = await requirePageUser("/admin/profile"); return <ProfilePage user={user} area="admin" passwordRequired={user.mustChangePassword} />; }
