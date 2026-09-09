import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { Shell } from "@/components/shell/Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return <Shell>{children}</Shell>;
}
