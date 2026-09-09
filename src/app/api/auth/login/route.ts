import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { encodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { ok, apiError } from "@/lib/api/respond";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_INPUT", "Email and password are required.", 400);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return apiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return apiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);

  const token = await encodeSession({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    email: user.email,
  });

  const res = ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
