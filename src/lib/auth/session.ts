// Uses the Web Crypto API (not Node's `crypto` module) so this file works
// unchanged in both the Node.js runtime (API routes) and the Edge runtime
// (middleware) — Next.js middleware runs on Edge by default.

const DEFAULT_DEV_SECRET = "dev-only-insecure-secret-change-me";
const SECRET = process.env.AUTH_SECRET || DEFAULT_DEV_SECRET;
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
    // Checked lazily (on first actual sign/verify) rather than at module
    // load, so importing this file during `next build`'s page-data
    // collection — which never signs or verifies anything — can't trip
    // this. It still fails fast the moment a real request tries to use a
    // production deployment with the placeholder secret still in place.
    if (process.env.NODE_ENV === "production" && SECRET === DEFAULT_DEV_SECRET) {
      throw new Error(
        "AUTH_SECRET is unset or still the default placeholder in a production build. " +
          "Set a real secret (see .env.example) before deploying."
      );
    }
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

/**
 * Constant-time string comparison for the HMAC signature check below — a
 * naive `===` short-circuits on the first differing byte, which leaks how
 * many leading bytes of a forged signature happened to match via timing.
 * Fixed-length HMAC-SHA256 output means a length mismatch only happens for
 * a malformed token, not a sensitive signal, so it's fine to return early.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
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
  if (!timingSafeEqual(expected, sig)) return null;
  try {
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}
