import { AreaShell, areaUser } from "@/components/app/areaShell";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await areaUser("admin", "/admin");
  return <AreaShell area="admin" user={user}>{children}</AreaShell>;
}
