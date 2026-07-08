/** Browser-side data helpers for SWR + mutations. */

export const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.error || `Request failed (${r.status})`);
    }
    return r.json();
  });

export async function postJSON<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d as T;
}

export async function del<T = unknown>(url: string): Promise<T> {
  const r = await fetch(url, { method: "DELETE" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d as T;
}

/** Route a Meta/Instagram CDN url through our proxy so the browser can load it. */
export function proxied(url?: string | null): string | undefined {
  return url ? `/api/image?url=${encodeURIComponent(url)}` : undefined;
}
