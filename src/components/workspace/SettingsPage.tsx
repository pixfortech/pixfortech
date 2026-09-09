import type { SessionUser } from "@/server/auth/session";
import { getPrefs, NOTIFICATION_CATEGORIES } from "@/server/services/notifications";
import { Card, CardHeader, PageTitle } from "@/components/app/primitives";
import { PasswordForm, PreferencesForm, ProfileForm } from "./forms";

export function ProfilePage({ user, area }: { user: SessionUser; area: "portal" | "admin" }) {
  return (
    <div className="max-w-3xl">
      <PageTitle eyebrow={area === "admin" ? "Admin" : "Portal"} title="Your profile" description="How you appear to the people you work with." />
      <div className="grid gap-6">
        <Card><CardHeader title="Details" /><div className="px-5 pb-5"><ProfileForm user={user} /></div></Card>
        <Card><CardHeader title="Password" description="Changing it signs out your other devices." /><div className="px-5 pb-5"><PasswordForm /></div></Card>
      </div>
    </div>
  );
}

export async function SettingsPage({ user, area }: { user: SessionUser; area: "portal" | "admin" }) {
  const { prefs, browserOptIn } = (await getPrefs(user.id));
  return (
    <div className="max-w-3xl">
      <PageTitle eyebrow={area === "admin" ? "Admin" : "Portal"} title="Settings" description="Decide what reaches you, and where." />
      <Card><CardHeader title="Notifications" description="In-app notifications appear in the bell and as pop-ups. Email is for the important things." /><div className="px-5 pb-5"><PreferencesForm prefs={prefs} browserOptIn={browserOptIn} categories={NOTIFICATION_CATEGORIES} /></div></Card>
    </div>
  );
}
