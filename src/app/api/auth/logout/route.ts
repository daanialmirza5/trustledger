import { ok } from "@/lib/api/respond";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const res = ok({ success: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
