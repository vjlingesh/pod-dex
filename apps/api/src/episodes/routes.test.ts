import { UploadTooLargeError } from "@pod-dex/storage";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NoActiveOrgError,
  type Variables,
  resetSessionResolver,
  setSessionResolver,
} from "../middleware/session.js";

// The storage and persistence boundaries are substituted here so the route logic
// — org scoping, validation, the size cap — is what gets exercised.
vi.mock("@pod-dex/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pod-dex/storage")>();
  return {
    ...actual,
    presignUpload: vi.fn(),
    statObject: vi.fn(),
    storageConfig: () => ({ maxUploadBytes: 500 * 1024 * 1024 }),
  };
});

// Enqueueing is a side effect of completing an upload; asserted here rather
// than exercised against a real Redis.
vi.mock("@pod-dex/queue", () => ({ enqueueTranscription: vi.fn() }));

vi.mock("./repo.js", () => ({
  createEpisode: vi.fn(),
  findEpisode: vi.fn(),
  listEpisodes: vi.fn(),
  updateEpisode: vi.fn(),
}));

const storage = await import("@pod-dex/storage");
const queue = await import("@pod-dex/queue");
const repo = await import("./repo.js");
const { episodeRoutes } = await import("./routes.js");

const user = { id: "user_1", email: "host@example.com", name: "Host" };

function app() {
  const instance = new Hono<{ Variables: Variables }>();
  instance.route("/episodes", episodeRoutes());
  // Mirrors createApp()'s handler so the status a caller actually sees is asserted.
  instance.onError((err, c) =>
    err instanceof NoActiveOrgError ? c.json({ error: err.message }, 409) : c.json({}, 500),
  );
  return instance;
}

const post = (path: string, body: unknown) =>
  app().request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.mocked(storage.presignUpload).mockResolvedValue({
    url: "https://s3.test/put",
    expiresIn: 900,
  });
  setSessionResolver(async () => ({ user, orgId: "org_1" }));
});

afterEach(() => {
  resetSessionResolver();
  vi.clearAllMocks();
});

describe("POST /episodes/upload-url", () => {
  it("creates the episode against the caller's org and returns a presigned url", async () => {
    const res = await post("/episodes/upload-url", {
      title: "Ep 1",
      filename: "ep.mp3",
      contentType: "audio/mpeg",
      contentLength: 1000,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { uploadUrl: string; key: string };
    expect(body.uploadUrl).toBe("https://s3.test/put");
    expect(body.key.startsWith("orgs/org_1/")).toBe(true);
    expect(vi.mocked(repo.createEpisode).mock.calls[0]?.[0]).toMatchObject({ orgId: "org_1" });
  });

  it("rejects a file over the cap before any episode row is written", async () => {
    vi.mocked(storage.presignUpload).mockRejectedValue(new UploadTooLargeError(524288000));

    const res = await post("/episodes/upload-url", {
      title: "Too big",
      filename: "big.mp3",
      contentLength: 600000000,
    });

    expect(res.status).toBe(413);
    expect(repo.createEpisode).not.toHaveBeenCalled();
  });

  it("requires a title", async () => {
    const res = await post("/episodes/upload-url", { filename: "ep.mp3", contentLength: 10 });
    expect(res.status).toBe(400);
  });

  it("refuses a request from a session with no active workspace", async () => {
    setSessionResolver(async () => ({ user, orgId: null }));

    const res = await post("/episodes/upload-url", {
      title: "Ep",
      filename: "ep.mp3",
      contentLength: 10,
    });

    expect(res.status).toBe(409);
    expect(repo.createEpisode).not.toHaveBeenCalled();
  });
});

describe("POST /episodes/:id/upload-complete", () => {
  const episode = {
    id: "ep_1",
    audioKey: "orgs/org_1/episodes/ep_1/audio/ep.mp3",
    audioContentType: "audio/mpeg",
  };

  it("marks the episode pending once the bytes are confirmed", async () => {
    vi.mocked(repo.findEpisode).mockResolvedValue(episode as never);
    vi.mocked(storage.statObject).mockResolvedValue({ size: 1234, contentType: "audio/mpeg" });
    vi.mocked(repo.updateEpisode).mockResolvedValue({ ...episode, status: "pending" } as never);

    const res = await post("/episodes/ep_1/upload-complete", {});

    expect(res.status).toBe(200);
    expect(vi.mocked(repo.updateEpisode).mock.calls[0]).toMatchObject([
      "org_1",
      "ep_1",
      { status: "pending", audioBytes: 1234 },
    ]);
    expect(queue.enqueueTranscription).toHaveBeenCalledWith({
      episodeId: "ep_1",
      orgId: "org_1",
    });
  });

  it("does not advance the episode when nothing was actually uploaded", async () => {
    vi.mocked(repo.findEpisode).mockResolvedValue(episode as never);
    vi.mocked(storage.statObject).mockResolvedValue(null);

    const res = await post("/episodes/ep_1/upload-complete", {});

    expect(res.status).toBe(409);
    expect(repo.updateEpisode).not.toHaveBeenCalled();
  });

  it("fails the episode when the stored object is over the cap", async () => {
    vi.mocked(repo.findEpisode).mockResolvedValue(episode as never);
    vi.mocked(storage.statObject).mockResolvedValue({ size: 600000000, contentType: "audio/mpeg" });

    const res = await post("/episodes/ep_1/upload-complete", {});

    expect(res.status).toBe(413);
    expect(vi.mocked(repo.updateEpisode).mock.calls[0]?.[2]).toMatchObject({ status: "failed" });
  });

  it("404s for an episode belonging to another org", async () => {
    vi.mocked(repo.findEpisode).mockResolvedValue(null);

    const res = await post("/episodes/someone-elses/upload-complete", {});

    expect(res.status).toBe(404);
  });
});
