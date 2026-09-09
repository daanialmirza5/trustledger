import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE, type SessionPayload } from "./session";

export async function getSessionUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  return await decodeSession(store.get(SESSION_COOKIE)?.value);
}
