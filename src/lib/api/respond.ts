import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function newRequestId(): string {
  return randomUUID();
}
