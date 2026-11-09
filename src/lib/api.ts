import { getStoredSession } from "@/lib/auth/authService";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  accessToken = getStoredSession()?.accessToken,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(path, { ...init, headers });
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("finsight_demo_session");
      window.dispatchEvent(new CustomEvent("finsight-session-expired", { detail: { path } }));
    }
  }
  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const rawBody = await response.text();
      if (rawBody.trim()) {
        const payload = JSON.parse(rawBody) as { detail?: unknown };
        if (typeof payload.detail === "string") message = payload.detail;
      } else {
        message = `Request failed with status ${response.status}. The server returned an empty response.`;
      }
    } catch {
      message = `Request failed with status ${response.status}. The server returned an invalid response.`;
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  const rawBody = await response.text();
  if (!rawBody.trim()) {
    throw new Error(`Request succeeded with status ${response.status}, but the server returned an empty response.`);
  }
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error(`Request succeeded with status ${response.status}, but the server returned an invalid response.`);
  }
}
