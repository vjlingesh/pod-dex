import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { type Episode, listEpisodes, uploadEpisode } from "../api.js";

const ACTIVE_STATUSES = new Set(["uploading", "pending", "transcribing", "generating"]);

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function EpisodesPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setEpisodes(await listEpisodes());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load episodes");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Episodes move through the pipeline in the background, so poll while any of
  // them is still working.
  useEffect(() => {
    if (!episodes.some((e) => ACTIVE_STATUSES.has(e.status))) return;
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [episodes, refresh]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;

    setError(null);
    setProgress(0);
    try {
      await uploadEpisode(title.trim(), file, setProgress);
      setTitle("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  }

  return (
    <main className="page">
      <h1>Episodes</h1>

      <section className="card">
        <h2>Upload an episode</h2>
        <form onSubmit={submit}>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ep 12 — How we scaled onboarding"
              required
            />
          </label>

          <label>
            Audio file
            <input
              ref={fileInput}
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>

          <p className="muted small">Up to 500 MB. Audio is deleted after 30 days.</p>

          {progress !== null && (
            <p className="muted small">Uploading… {Math.round(progress * 100)}%</p>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={progress !== null || !file || !title.trim()}>
            {progress !== null ? "Uploading…" : "Upload"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Your episodes</h2>
        {episodes.length === 0 ? (
          <p className="muted">Nothing uploaded yet.</p>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((episode) => (
                <tr key={episode.id}>
                  <td>
                    <button type="button" className="link" onClick={() => onOpen(episode.id)}>
                      {episode.title}
                    </button>
                  </td>
                  <td>
                    <span className={`status status-${episode.status}`}>{episode.status}</span>
                    {episode.error && <div className="error small">{episode.error}</div>}
                  </td>
                  <td>{formatSize(episode.audioBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
