// Uses the Web Crypto API (not Node's `crypto` module) so this file works
// unchanged in both the Node.js runtime (API routes) and the Edge runtime
// (middleware) — Next.js middleware runs on Edge by default.

const SECRET = process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
export const SESSION_COOKIE = "trustledger_session";

export interface SessionPayload {
  userId: string;
  organizationId: string;
  role: "OWNER" | "ACCOUNTANT" | "ANALYST" | "ADMIN";
  email: string;
}

let keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return keyPromise;
}

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

async function sign(value: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(sig);
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = await sign(json);
  return `${json}.${sig}`;
}

export async function decodeSession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;
  const expected = await sign(json);
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}
