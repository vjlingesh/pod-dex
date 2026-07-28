/** Same-origin base — Vite proxies /api to the Hono server in development. */
const BASE = "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res));
  }

  return (await res.json()) as T;
}

/** Surfaces the API's own `error` field when there is one, so users see the real reason. */
async function errorMessage(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // not JSON — fall through
  }
  return body || `Request failed: ${res.status}`;
}

export type Health = { ok: boolean; db: boolean };

export const getHealth = () => apiFetch<Health>("/health");

export type EpisodeStatus =
  | "uploading"
  | "pending"
  | "transcribing"
  | "transcribed"
  | "generating"
  | "ready"
  | "failed";

export type Episode = {
  id: string;
  title: string;
  status: EpisodeStatus;
  source: string;
  audioBytes: number | null;
  durationSeconds: number | null;
  error: string | null;
  createdAt: string;
};

export const listEpisodes = () =>
  apiFetch<{ episodes: Episode[] }>("/episodes").then((r) => r.episodes);

export const getEpisode = (id: string) =>
  apiFetch<{ episode: Episode }>(`/episodes/${id}`).then((r) => r.episode);

type UploadTicket = {
  episodeId: string;
  key: string;
  uploadUrl: string;
  expiresIn: number;
  maxBytes: number;
};

/**
 * Three steps: ask for a ticket, PUT the bytes straight to object storage, then
 * tell the API they landed. The audio never passes through the API.
 */
export async function uploadEpisode(
  title: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<Episode> {
  const ticket = await apiFetch<UploadTicket>("/episodes/upload-url", {
    method: "POST",
    body: JSON.stringify({
      title,
      filename: file.name,
      contentType: file.type || "audio/mpeg",
      contentLength: file.size,
    }),
  });

  await putWithProgress(ticket.uploadUrl, file, onProgress);

  return apiFetch<{ episode: Episode }>(`/episodes/${ticket.episodeId}/upload-complete`, {
    method: "POST",
    body: JSON.stringify({}),
  }).then((r) => r.episode);
}

/** XHR rather than fetch: fetch still cannot report upload progress. */
function putWithProgress(
  url: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "audio/mpeg");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError(xhr.status, `Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new ApiError(0, "Upload failed — could not reach storage"));

    xhr.send(file);
  });
}
