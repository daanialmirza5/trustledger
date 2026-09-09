export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiClientError(res.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}
