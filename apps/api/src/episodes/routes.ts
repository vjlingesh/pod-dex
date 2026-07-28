import { randomUUID } from "node:crypto";
import { enqueueGeneration, enqueueTranscription } from "@pod-dex/queue";
import {
  UploadTooLargeError,
  audioKey,
  keyBelongsToOrg,
  presignDownload,
  presignUpload,
  statObject,
  storageConfig,
} from "@pod-dex/storage";
import { Hono } from "hono";
import { type Variables, requireOrg, requireSession } from "../middleware/session.js";
import { findTranscript, listOutputs, setOutputUsed } from "./outputs-repo.js";
import { createEpisode, findEpisode, listEpisodes, updateEpisode } from "./repo.js";

type UploadUrlBody = {
  title?: unknown;
  filename?: unknown;
  contentType?: unknown;
  contentLength?: unknown;
};

export function episodeRoutes() {
  const routes = new Hono<{ Variables: Variables }>();

  routes.use("*", requireSession);

  routes.get("/", async (c) => c.json({ episodes: await listEpisodes(requireOrg(c)) }));

  routes.get("/:id", async (c) => {
    const episode = await findEpisode(requireOrg(c), c.req.param("id"));
    return episode ? c.json({ episode }) : c.json({ error: "not found" }, 404);
  });

  routes.get("/:id/outputs", async (c) => {
    const orgId = requireOrg(c);
    const episodeId = c.req.param("id");

    const episode = await findEpisode(orgId, episodeId);
    if (!episode) return c.json({ error: "not found" }, 404);

    return c.json({ outputs: await listOutputs(orgId, episodeId) });
  });

  /**
   * Short-lived signed URL for the source audio, used by the player and the
   * download button. The API hands out a URL rather than the bytes, for the same
   * reason uploads bypass it: audio never passes through this process.
   *
   * Audio is deleted after 30 days while transcripts are kept indefinitely, so a
   * missing object is an expected end state for an old episode, not an error —
   * hence 410 rather than 404, which lets the UI say "expired" instead of
   * "broken".
   */
  routes.get("/:id/audio-url", async (c) => {
    const orgId = requireOrg(c);

    const episode = await findEpisode(orgId, c.req.param("id"));
    if (!episode) return c.json({ error: "not found" }, 404);
    if (!episode.audioKey) return c.json({ error: "episode has no audio" }, 404);

    // Belt and braces: the key was built from this org's prefix, but the check
    // is cheap and a leaked key must never be signable by another tenant.
    if (!keyBelongsToOrg(episode.audioKey, orgId)) {
      return c.json({ error: "not found" }, 404);
    }

    if (!(await statObject(episode.audioKey))) {
      return c.json({ error: "audio has expired", expired: true }, 410);
    }

    const expiresIn = 900;
    return c.json({
      url: await presignDownload(episode.audioKey, expiresIn),
      expiresIn,
      contentType: episode.audioContentType,
    });
  });

  routes.get("/:id/transcript", async (c) => {
    const orgId = requireOrg(c);

    const episode = await findEpisode(orgId, c.req.param("id"));
    if (!episode) return c.json({ error: "not found" }, 404);

    const transcript = await findTranscript(orgId, episode.id);
    return transcript ? c.json({ transcript }) : c.json({ error: "no transcript yet" }, 404);
  });

  /** Mark-as-used is a per-output toggle the user drives from the outputs page. */
  routes.patch("/:id/outputs/:outputId", async (c) => {
    const orgId = requireOrg(c);
    const body = (await c.req.json().catch(() => ({}))) as { markedUsed?: unknown };

    if (typeof body.markedUsed !== "boolean") {
      return c.json({ error: "markedUsed must be a boolean" }, 400);
    }

    const updated = await setOutputUsed(orgId, c.req.param("outputId"), body.markedUsed);
    return updated ? c.json({ output: updated }) : c.json({ error: "not found" }, 404);
  });

  /** Re-runs generation for an episode that already has a transcript. */
  routes.post("/:id/regenerate", async (c) => {
    const orgId = requireOrg(c);

    const episode = await findEpisode(orgId, c.req.param("id"));
    if (!episode) return c.json({ error: "not found" }, 404);

    const transcript = await findTranscript(orgId, episode.id);
    if (!transcript) return c.json({ error: "episode has no transcript yet" }, 409);

    await updateEpisode(orgId, episode.id, { status: "generating", error: null });
    await enqueueGeneration({ episodeId: episode.id, orgId, regenerate: true });

    return c.json({ ok: true });
  });

  /**
   * Creates the episode row and hands back a presigned PUT. The row starts as
   * `uploading`; it only becomes `pending` once the bytes are confirmed, so a
   * client that abandons the upload never leaves work queued behind it.
   */
  routes.post("/upload-url", async (c) => {
    const orgId = requireOrg(c);
    const body = (await c.req.json().catch(() => ({}))) as UploadUrlBody;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const filename = typeof body.filename === "string" ? body.filename : "";
    const contentType =
      typeof body.contentType === "string" && body.contentType ? body.contentType : "audio/mpeg";
    const contentLength = Number(body.contentLength);

    if (!title) return c.json({ error: "title is required" }, 400);
    if (!filename) return c.json({ error: "filename is required" }, 400);
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      return c.json({ error: "contentLength must be a positive number" }, 400);
    }

    const episodeId = randomUUID();
    const key = audioKey(orgId, episodeId, filename);

    let presigned: { url: string; expiresIn: number };
    try {
      presigned = await presignUpload({ key, contentType, contentLength });
    } catch (err) {
      if (err instanceof UploadTooLargeError) {
        return c.json({ error: err.message, limitBytes: err.limitBytes }, 413);
      }
      throw err;
    }

    await createEpisode({
      id: episodeId,
      orgId,
      userId: c.get("user").id,
      title,
      audioKey: key,
      audioContentType: contentType,
    });

    return c.json({
      episodeId,
      key,
      uploadUrl: presigned.url,
      expiresIn: presigned.expiresIn,
      maxBytes: storageConfig().maxUploadBytes,
    });
  });

  /**
   * Confirms the upload actually landed. The stored size is re-checked here
   * because a presigned PUT cannot enforce a byte cap — the check at
   * upload-url time is advisory, this one is binding.
   */
  routes.post("/:id/upload-complete", async (c) => {
    const orgId = requireOrg(c);
    const episode = await findEpisode(orgId, c.req.param("id"));

    if (!episode) return c.json({ error: "not found" }, 404);
    if (!episode.audioKey) return c.json({ error: "episode has no audio key" }, 409);

    const stat = await statObject(episode.audioKey);
    if (!stat) return c.json({ error: "no audio found at the upload location" }, 409);

    const { maxUploadBytes } = storageConfig();
    if (stat.size > maxUploadBytes) {
      await updateEpisode(orgId, episode.id, {
        status: "failed",
        error: `upload exceeds the ${Math.round(maxUploadBytes / 1024 / 1024)} MB limit`,
      });
      return c.json({ error: "upload exceeds the size limit", limitBytes: maxUploadBytes }, 413);
    }

    const updated = await updateEpisode(orgId, episode.id, {
      status: "pending",
      audioBytes: stat.size,
      audioContentType: stat.contentType ?? episode.audioContentType,
    });

    // Queued only after the row is `pending`, so the worker can never pick up an
    // episode whose audio has not been confirmed.
    await enqueueTranscription({ episodeId: episode.id, orgId });

    return c.json({ episode: updated });
  });

  return routes;
}
