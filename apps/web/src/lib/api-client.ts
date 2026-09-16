"use client";

interface ApiErrorBody {
  error?: { code?: string; message?: string } | string;
}

export function apiErrorMessage(json: unknown, fallback: string): string {
  const body = json as ApiErrorBody | null;
  const message = typeof body?.error === "object" ? body.error.message : body?.error;
  return message ?? fallback;
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(apiErrorMessage(json, res.statusText));
  return json as T;
}
