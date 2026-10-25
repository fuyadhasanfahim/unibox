// Minimal client for our REST API (/api/v1, proxied). Unwraps the server's error envelope.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

type Envelope = { error?: { code?: string; message?: string; details?: { path: string; message: string }[] } };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await res.json().catch(() => ({}))) as T & Envelope;
  if (!res.ok) {
    throw new ApiError(
      body.error?.message ?? "Something went wrong. Please try again.",
      res.status,
      body.error?.code ?? "UNKNOWN",
      body.error?.details,
    );
  }
  return body;
}
