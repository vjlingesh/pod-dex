import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  type Episode,
  type Output,
  getEpisode,
  listOutputs,
  regenerate,
  setOutputUsed,
} from "../api.js";
import { OutputCard } from "../components/OutputCard.js";

const WORKING = new Set(["uploading", "pending", "transcribing", "generating"]);

export function EpisodePage() {
  const { id = "" } = useParams();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const [nextEpisode, nextOutputs] = await Promise.all([getEpisode(id), listOutputs(id)]);
      setEpisode(nextEpisode);
      setOutputs(nextOutputs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load episode");
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while the pipeline is still working on this episode.
  useEffect(() => {
    if (!episode || !WORKING.has(episode.status)) return;
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [episode, refresh]);

  async function toggleUsed(output: Output, markedUsed: boolean) {
    // Optimistic, then reconciled against what the server actually stored.
    setOutputs((current) => current.map((o) => (o.id === output.id ? { ...o, markedUsed } : o)));
    const saved = await setOutputUsed(id, output.id, markedUsed);
    setOutputs((current) => current.map((o) => (o.id === saved.id ? saved : o)));
  }

  if (error) {
    return (
      <main className="page">
        <p className="error" role="alert">
          {error}
        </p>
        <Link to="/">Back to episodes</Link>
      </main>
    );
  }

  if (!episode) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <p>
        <Link to="/">← Episodes</Link>
      </p>

      <h1>{episode.title}</h1>
      <p className="muted">
        <span className={`status status-${episode.status}`}>{episode.status}</span>
        {episode.durationSeconds ? ` · ${Math.round(episode.durationSeconds / 60)} min` : ""}
      </p>

      {episode.error && (
        <p className="error" role="alert">
          {episode.error}
        </p>
      )}

      {WORKING.has(episode.status) && (
        <section className="card">
          <p className="muted">
            {episode.status === "transcribing"
              ? "Transcribing the audio…"
              : episode.status === "generating"
                ? "Writing your outputs…"
                : "Waiting to be picked up…"}
          </p>
        </section>
      )}

      {outputs.map((output) => (
        <OutputCard
          key={output.id}
          output={output}
          onToggleUsed={(markedUsed) => toggleUsed(output, markedUsed)}
        />
      ))}

      {episode.status === "ready" && (
        <p>
          <button
            type="button"
            className="secondary"
            onClick={() => regenerate(id).then(() => refresh())}
          >
            Regenerate
          </button>
        </p>
      )}
    </main>
  );
}
