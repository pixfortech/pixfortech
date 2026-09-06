import { AreaShell, areaUser } from "@/components/app/areaShell";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await areaUser("portal", "/portal");
  return <AreaShell area="portal" user={user}>{children}</AreaShell>;
}
