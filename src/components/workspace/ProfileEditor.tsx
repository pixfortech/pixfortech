"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppButton, Avatar, Badge, Card, CardHeader, Field, inputCls } from "@/components/app/primitives";
import { useRealtime } from "@/components/app/RealtimeProvider";
import { checkIdentityAction, setProfilePublishedAction, setPublicSlugAction, setUsernameAction, updateProfileAction } from "@/server/actions/profile";
import { slugify, USERNAME_MAX, validateSlug, validateUsername } from "@/lib/profile/identity";
import { useHydrated } from "@/lib/useHydrated";
import { cn } from "@/lib/utils";
import { copy } from "@content/microcopy";

export type EditableProfile = {
  id: string; name: string; email: string; role: string; image: string | null; title: string | null; timezone: string | null;
  username: string | null; publicSlug: string | null; publicProfile: boolean; displayName: string | null; bio: string | null;
  linkedinUrl: string | null; githubUrl: string | null; websiteUrl: string | null; avatarKey: string | null;
};

type Status = { state: "idle" | "checking" | "ok" | "bad"; reason?: string; value?: string };

function useIdentityCheck(kind: "username" | "slug", initial: string, localCheck: (v: string) => { ok: boolean; reason?: string; value?: string }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const timer = useRef(0);
  const seq = useRef(0);
  const onChange = (next: string) => {
    setValue(next);
    clearTimeout(timer.current);
    if (next.trim().toLowerCase() === initial) { setStatus({ state: "idle" }); return; }
    const local = localCheck(next);
    if (!local.ok) { setStatus({ state: "bad", reason: local.reason }); return; }
    setStatus({ state: "checking" });
    const id = ++seq.current;
    timer.current = window.setTimeout(async () => {
      const res = await checkIdentityAction({ kind, value: next });
      if (id !== seq.current) return;
      if (!res.ok || !res.data) { setStatus({ state: "bad", reason: res.ok ? "Could not check right now." : res.error }); return; }
      setStatus(res.data.ok ? { state: "ok", value: res.data.value } : { state: "bad", reason: res.data.reason });
    }, 350);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return { value, onChange, status, reset: (v: string) => { setValue(v); setStatus({ state: "idle" }); } };
}

function StatusLine({ status, okText }: { status: Status; okText: string }) {
  if (status.state === "idle") return null;
  return (
    <p className={cn("mt-1.5 text-[0.75rem]", status.state === "bad" ? "text-forge-300" : status.state === "ok" ? "text-[#9fe0bb]" : "text-bone-400")} role="status" aria-live="polite">
      {status.state === "checking" ? "Checking the registry…" : status.state === "ok" ? okText : status.reason}
    </p>
  );
}

export function ProfileEditor({ profile, canPublish, siteOrigin, editingOther }: { profile: EditableProfile; canPublish: boolean; siteOrigin: string; editingOther?: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { toast } = useRealtime();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const username = useIdentityCheck("username", profile.username ?? "", (v) => validateUsername(v));
  const slug = useIdentityCheck("slug", profile.publicSlug ?? "", (v) => validateSlug(v));
  const [published, setPublished] = useState(profile.publicProfile);
  const [copied, setCopied] = useState(false);
  const targetId = editingOther ? profile.id : undefined;
  const publicUrl = `${siteOrigin}/people/${profile.publicSlug ?? slug.value}`;

  const saveDetails = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    start(async () => {
      setError(null); setFieldErrors({});
      const res = await updateProfileAction({ ...fd, userId: targetId });
      if (!res.ok) { setError(res.error); setFieldErrors(res.fieldErrors ?? {}); return; }
      toast({ title: copy.profile.savedTitle, body: copy.profile.savedBody, kind: "success" });
      router.refresh();
    });
  };
  const saveUsername = () => start(async () => {
    const res = await setUsernameAction({ username: username.value, userId: targetId });
    if (!res.ok) { setError(res.error); return; }
    username.reset(res.data ?? username.value);
    toast({ title: "Username updated", body: `You are now @${res.data}.`, kind: "success" });
    router.refresh();
  });
  const saveSlug = () => start(async () => {
    const res = await setPublicSlugAction({ slug: slug.value, userId: targetId });
    if (!res.ok) { setError(res.error); return; }
    slug.reset(res.data ?? slug.value);
    toast({ title: "Address updated", body: "The old address now redirects here, so nothing breaks.", kind: "success" });
    router.refresh();
  });
  const togglePublished = (next: boolean) => { setPublished(next); start(async () => {
    const res = await setProfilePublishedAction({ published: next, userId: targetId });
    if (!res.ok) { setPublished(!next); setError(res.error); return; }
    toast({ title: next ? copy.profile.publishedTitle : copy.profile.unpublishedTitle, body: next ? copy.profile.publishedBody : copy.profile.unpublishedBody, kind: "success" });
    router.refresh();
  }); };
  const copyUrl = async () => { try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError("Could not copy. Select the address and copy it by hand."); } };

  return (
    <div className="grid gap-6">
      {error && <p role="alert" className="rounded-md border border-forge-500/40 bg-forge-500/10 px-3 py-2 text-[0.8125rem] text-forge-300">{error}</p>}

      <Card>
        <CardHeader title={copy.profile.identityTitle} description={copy.profile.identityBody} />
        <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[auto_1fr]">
          <AvatarUploader profile={profile} targetId={targetId} />
          <form onSubmit={saveDetails} className="grid gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="pr-name" error={fieldErrors.name}><input id="pr-name" name="name" defaultValue={profile.name} className={inputCls} disabled={!hydrated} /></Field>
              <Field label="Display name" htmlFor="pr-display" optional hint="Shown on your public page if it differs." error={fieldErrors.displayName}><input id="pr-display" name="displayName" defaultValue={profile.displayName ?? ""} className={inputCls} disabled={!hydrated} /></Field>
              <Field label="Job title" htmlFor="pr-title" optional error={fieldErrors.title}><input id="pr-title" name="title" defaultValue={profile.title ?? ""} placeholder="Frontend engineer" className={inputCls} disabled={!hydrated} /></Field>
              <Field label="Timezone" htmlFor="pr-tz" optional hint="IANA name, e.g. Asia/Kolkata." error={fieldErrors.timezone}><input id="pr-tz" name="timezone" defaultValue={profile.timezone ?? ""} placeholder="Europe/London" className={inputCls} disabled={!hydrated} /></Field>
            </div>
            <Field label="Email" htmlFor="pr-email" hint="Contact the studio to change the email on the account."><input id="pr-email" value={profile.email} disabled className={inputCls} /></Field>
            <Field label="Short bio" htmlFor="pr-bio" optional hint="Plain text, up to 600 characters. Appears on your public page when published." error={fieldErrors.bio}><textarea id="pr-bio" name="bio" rows={4} defaultValue={profile.bio ?? ""} maxLength={600} className={inputCls} disabled={!hydrated} /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Website" htmlFor="pr-web" optional error={fieldErrors.websiteUrl}><input id="pr-web" name="websiteUrl" defaultValue={profile.websiteUrl ?? ""} placeholder="https://" className={inputCls} disabled={!hydrated} inputMode="url" /></Field>
              <Field label="LinkedIn" htmlFor="pr-li" optional error={fieldErrors.linkedinUrl}><input id="pr-li" name="linkedinUrl" defaultValue={profile.linkedinUrl ?? ""} placeholder="linkedin.com/in/…" className={inputCls} disabled={!hydrated} inputMode="url" /></Field>
              <Field label="GitHub" htmlFor="pr-gh" optional error={fieldErrors.githubUrl}><input id="pr-gh" name="githubUrl" defaultValue={profile.githubUrl ?? ""} placeholder="github.com/…" className={inputCls} disabled={!hydrated} inputMode="url" /></Field>
            </div>
            <div className="flex justify-end"><AppButton type="submit" disabled={pending || !hydrated}>{pending ? "Saving…" : "Save details"}</AppButton></div>
          </form>
        </div>
      </Card>

      <Card>
        <CardHeader title={copy.profile.usernameTitle} description={copy.profile.usernameBody} />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <Field label="Username" htmlFor="pr-username" hint={`3 to ${USERNAME_MAX} characters. Letters, numbers, dots or underscores.`}>
              <div className="flex items-center rounded-md border border-line bg-ink-900 focus-within:border-forge-400">
                <span className="pl-3 text-bone-400" aria-hidden="true">@</span>
                <input id="pr-username" value={username.value} onChange={(e) => username.onChange(e.target.value)} disabled={!hydrated} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={USERNAME_MAX + 1} className="w-full bg-transparent px-2 py-2 text-[0.875rem] text-bone-50 focus:outline-none" aria-describedby="pr-username-status" data-testid="username-input" />
              </div>
            </Field>
            <div id="pr-username-status"><StatusLine status={username.status} okText="Available. Nobody has forged that yet." /></div>
          </div>
          <AppButton variant="secondary" className="sm:mt-7" disabled={pending || username.status.state !== "ok"} onClick={saveUsername} data-testid="save-username">Update username</AppButton>
        </div>
      </Card>

      {canPublish && (
        <Card>
          <CardHeader title={copy.profile.addressTitle} description={copy.profile.addressBody} action={<Badge tone={published ? "good" : "muted"} dot>{published ? "Published" : "Private"}</Badge>} />
          <div className="grid gap-4 px-5 pb-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <Field label="Public address" htmlFor="pr-slug" hint="Lowercase letters, numbers and hyphens. Old addresses keep redirecting.">
                  <div className="flex items-center rounded-md border border-line bg-ink-900 focus-within:border-forge-400">
                    <span className="hidden truncate pl-3 text-[0.8125rem] text-bone-400 sm:inline" aria-hidden="true">{siteOrigin.replace(/^https?:\/\//, "")}/people/</span>
                    <span className="pl-3 text-[0.8125rem] text-bone-400 sm:hidden" aria-hidden="true">/people/</span>
                    <input id="pr-slug" value={slug.value} onChange={(e) => slug.onChange(e.target.value)} onBlur={() => { if (slug.value !== slugify(slug.value)) slug.onChange(slugify(slug.value)); }} disabled={!hydrated} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="w-full min-w-0 bg-transparent px-2 py-2 text-[0.875rem] text-bone-50 focus:outline-none" aria-describedby="pr-slug-status" data-testid="slug-input" />
                  </div>
                </Field>
                <div id="pr-slug-status"><StatusLine status={slug.status} okText="Free. That corner of the Forge is yours." /></div>
              </div>
              <AppButton variant="secondary" className="sm:mt-7" disabled={pending || slug.status.state !== "ok"} onClick={saveSlug} data-testid="save-slug">Update address</AppButton>
            </div>
            {profile.publicSlug && (
              <div className="flex flex-col gap-3 rounded-md border border-line bg-ink-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[0.75rem] uppercase tracking-[0.08em] text-bone-400">{copy.profile.yourCorner}</p>
                  <p className="num mt-1 truncate text-[0.875rem] text-bone-50" data-testid="public-url">{publicUrl}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <AppButton size="sm" variant="secondary" onClick={copyUrl} aria-live="polite">{copied ? "Copied" : "Copy address"}</AppButton>
                  <AppButton size="sm" variant="secondary" href={`/people/${profile.publicSlug}${published ? "" : "?preview=1"}`} target="_blank" rel="noopener">{published ? "View page" : "Preview"}</AppButton>
                </div>
              </div>
            )}
            <label className="flex items-start gap-3 rounded-md border border-line p-4 text-[0.875rem]">
              <input type="checkbox" checked={published} disabled={pending || !profile.publicSlug || !hydrated} onChange={(e) => togglePublished(e.target.checked)} className="mt-0.5 accent-forge-500" data-testid="publish-toggle" />
              <span>
                <span className="block font-medium text-bone-50">Publish my profile</span>
                <span className="block text-bone-400">{copy.profile.publishHint}</span>
              </span>
            </label>
          </div>
        </Card>
      )}
      {!canPublish && (
        <Card>
          <CardHeader title="Visibility" description="Client profiles are private. Only the Pixel Forge team and people in your organisation can see your name and picture." />
        </Card>
      )}
    </div>
  );
}

function AvatarUploader({ profile, targetId }: { profile: EditableProfile; targetId?: string }) {
  const router = useRouter();
  const { toast } = useRealtime();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const upload = async (file: File) => {
    setError(null);
    if (file.size > 2 * 1024 * 1024) { setError("Keep it under 2 MB."); return; }
    setBusy(true);
    try {
      const fd = new FormData(); fd.set("file", file); if (targetId) fd.set("userId", targetId);
      const res = await fetch("/api/avatar", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({ ok: false, error: "Upload failed." }));
      if (!res.ok || !json.ok) { setError(json.error ?? "Upload failed."); return; }
      setPreview(json.url);
      toast({ title: "Picture updated", body: "Looking sharp. Pixel-sharp.", kind: "success" });
      router.refresh();
    } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { const res = await fetch(`/api/avatar${targetId ? `?user=${targetId}` : ""}`, { method: "DELETE" }); if (res.ok) { setPreview(null); router.refresh(); } }
    finally { setBusy(false); }
  };
  const image = preview ?? profile.image;
  return (
    <div className="flex flex-col items-start gap-3">
      <Avatar name={profile.name} image={image} size={96} className="rounded-md" />
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choose a profile picture" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <div className="flex flex-wrap gap-2">
        <AppButton size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : image ? "Change picture" : "Add picture"}</AppButton>
        {image && <AppButton size="sm" variant="ghost" disabled={busy} onClick={remove}>Remove</AppButton>}
      </div>
      <p className="max-w-[12rem] text-[0.75rem] text-bone-600">PNG, JPEG or WebP, under 2 MB. Square crops look best.</p>
      {error && <p role="alert" className="text-[0.75rem] text-forge-300">{error}</p>}
    </div>
  );
}
