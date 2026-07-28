import { randomUUID } from "node:crypto";
import {
  UploadTooLargeError,
  audioKey,
  presignUpload,
  statObject,
  storageConfig,
} from "@pod-dex/storage";
import { Hono } from "hono";
import { type Variables, requireOrg, requireSession } from "../middleware/session.js";
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

    return c.json({ episode: updated });
  });

  return routes;
}
