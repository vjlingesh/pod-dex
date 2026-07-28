import { forwardRef, useEffect, useState } from "react";
import { type AudioAccess, getAudioAccess } from "../api.js";

type Props = { episodeId: string; title: string };

/**
 * Plays the source audio and exposes the underlying element through a ref so
 * chapter timestamps elsewhere on the page can seek it.
 */
export const AudioPlayer = forwardRef<HTMLAudioElement, Props>(function AudioPlayer(
  { episodeId, title },
  ref,
) {
  const [access, setAccess] = useState<AudioAccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAudioAccess(episodeId).then(
      (next) => !cancelled && setAccess(next),
      (err: unknown) =>
        !cancelled && setError(err instanceof Error ? err.message : "Could not load audio"),
    );

    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  if (error) {
    return (
      <section className="card">
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!access) return null;

  if (access.status === "expired") {
    return (
      <section className="card">
        <p className="muted">
          The audio for this episode has been deleted — recordings are kept for 30 days. The
          transcript and everything generated from it are still here.
        </p>
      </section>
    );
  }

  if (access.status === "absent") return null;

  return (
    <section className="card">
      {/* No captions track: this is the source recording the transcript below was made from. */}
      {/* biome-ignore lint/a11y/useMediaCaption: the page renders the transcript in full */}
      <audio ref={ref} controls preload="metadata" src={access.url} className="player" />
      <p>
        <a href={access.url} download={`${title}.mp3`} className="small">
          Download audio
        </a>
      </p>
    </section>
  );
});
