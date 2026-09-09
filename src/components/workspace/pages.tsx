import Link from "next/link";
import { notFound } from "next/navigation";
import type { SessionUser } from "@/server/auth/session";
import { listNotifications } from "@/server/services/notifications";
import { listConversations, listMessages } from "@/server/services/messages";
import { getRequest } from "@/server/services/requests";
import { assignableUsers } from "@/server/services/directory";
import { isStaff } from "@/server/auth/permissions";
import { Badge, Card, EmptyState, PageTitle, timeAgo, ProjectMark } from "@/components/app/primitives";
import { NotificationList } from "./NotificationList";
import { Chat } from "./Chat";
import { RequestDetail } from "./RequestDetail";
import { cn } from "@/lib/utils";

export async function NotificationsPage({ user, area }: { user: SessionUser; area: "portal" | "admin" }) {
  const items = (await listNotifications(user.id, 100));
  return (
    <div>
      <PageTitle eyebrow={area === "admin" ? "Admin" : "Portal"} title="Notifications" description="Everything that needed your attention, newest first." actions={<Link href={`/${area}/settings`} className="text-[0.8125rem] text-forge-300 hover:text-forge-400">Preferences →</Link>} />
      <NotificationList items={items} area={area} />
    </div>
  );
}

export async function MessagesInbox({ user, area, conversationId }: { user: SessionUser; area: "portal" | "admin"; conversationId?: string }) {
  const convs = await listConversations(user);
  const current = conversationId ? convs.find((c) => c.id === conversationId) : convs.find((c) => !c.requestId && !c.internal) ?? convs[0];
  const thread = current ? await listMessages(user, current.id) : null;
  const staff = isStaff(user);
  return (
    <div>
      <PageTitle eyebrow={area === "admin" ? "Admin" : "Portal"} title="Messages" description="Project channels and request threads, live." />
      {convs.length === 0 ? <EmptyState title="No conversations yet" body="Each project has a chat. It will appear here once you have a project." /> : (
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-4">
            <ul className="max-h-[70vh] divide-y divide-line-faint overflow-y-auto">
              {convs.map((c) => (
                <li key={c.id}>
                  <Link href={`/${area}/messages?c=${c.id}`} className={cn("flex items-start gap-3 px-4 py-3 hover:bg-bone-50/[0.03]", current?.id === c.id && "bg-bone-50/5")}>
                    <span className="mt-1"><ProjectMark size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className="truncate text-[0.875rem] font-medium text-bone-50">{c.title}</span>{c.unread > 0 && <span className="num rounded-pill bg-forge-500 px-1.5 text-[0.625rem] font-semibold text-ink-950">{c.unread}</span>}</span>
                      <span className="block truncate text-[0.75rem] text-bone-400">{c.projectCode} · {c.projectTitle}{c.internal && <Badge tone="internal" className="ml-2">Internal</Badge>}</span>
                      {c.last && <span className="block truncate text-[0.75rem] text-bone-600">{c.last.authorName.split(" ")[0]}: {c.last.body} · {timeAgo(c.last.createdAt)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <div className="lg:col-span-8">
            {thread && current ? (
              <>
                <p className="mb-2 text-[0.8125rem] text-bone-400">{current.projectCode} · <Link href={`/${area}/projects/${current.projectId}`} className="text-bone-50 hover:text-forge-300">{current.projectTitle}</Link>{current.requestId && <> · <Link href={`/${area}/requests/${current.requestId}`} className="text-forge-300">Open request</Link></>}</p>
                <Chat conversationId={current.id} projectId={current.projectId} messages={thread.messages} readers={thread.readers} currentUserId={user.id} internal={current.internal} participants={thread.readers.map((r) => ({ id: r.id, name: r.name }))} />
              </>
            ) : <EmptyState title="Pick a conversation" />}
            {staff && <p className="mt-2 text-[0.6875rem] text-bone-600">Internal channels are striped amber and never reach the client portal.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export async function RequestPage({ user, id, area }: { user: SessionUser; id: string; area: "portal" | "admin" }) {
  const r = await getRequest(user, id);
  if (!r) notFound();
  const staff = isStaff(user);
  const assignees = staff ? (await assignableUsers(user)).filter((u) => !u.organisationId || u.organisationId === r.project.organisationId).filter((u) => ["super_admin", "admin", "project_manager", "team_member"].includes(u.role)) : [];
  return (
    <div>
      <p className="mb-2 text-[0.75rem] text-bone-400"><Link href={`/${area}/requests`} className="hover:text-bone-50">Requests</Link> <span className="text-bone-600">/</span> <span className="num">{r.ref}</span></p>
      <PageTitle title={r.title} description={<span>{r.project.code} · <Link href={`/${area}/projects/${r.project.id}`} className="text-bone-50 hover:text-forge-300">{r.project.title}</Link></span>} />
      <RequestDetail r={{ ...r, files: r.files.map((f) => ({ ...f, uploader: null })) }} area={area} staff={staff} currentUserId={user.id} assignees={assignees} />
    </div>
  );
}
