import type { SessionUser } from "@/server/auth/session";
import { getPrefs, NOTIFICATION_CATEGORIES } from "@/server/services/notifications";
import { Card, CardHeader, PageTitle } from "@/components/app/primitives";
import { PasswordForm, PreferencesForm } from "./forms";
import { ProfileEditor } from "./ProfileEditor";
import { canPublishProfile, ensureIdentityDefaults, getProfile } from "@/server/services/profile";
import { copy } from "@content/microcopy";
import { site } from "@/lib/content";

export async function ProfilePage({ user, area, passwordRequired }: { user: SessionUser; area: "portal" | "admin"; passwordRequired?: boolean }) {
  await ensureIdentityDefaults(user.id);
  const profile = await getProfile(user.id);
  if (!profile) return null;
  return (
    <div className="max-w-3xl">
      <PageTitle eyebrow={area === "admin" ? "Admin" : "Portal"} title={copy.profile.pageTitle} description={copy.profile.pageLead} />
      <div className="grid gap-6">
        {passwordRequired && (
          <Card className="border-[#f0b35a]/50" id="password">
            <CardHeader title={copy.auth.mustChangeTitle} description={copy.profile.passwordBody} />
            <div className="px-5 pb-5"><PasswordForm required /></div>
          </Card>
        )}
        <ProfileEditor profile={profile} canPublish={canPublishProfile(user)} siteOrigin={site.url} />
        {!passwordRequired && (
          <Card id="password"><CardHeader title={copy.profile.passwordTitle} description={copy.profile.passwordBody} /><div className="px-5 pb-5"><PasswordForm /></div></Card>
        )}
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
