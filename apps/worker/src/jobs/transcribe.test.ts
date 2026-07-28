import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@pod-dex/storage", () => ({ presignDownload: vi.fn() }));
vi.mock("@pod-dex/transcription", () => ({ transcribe: vi.fn() }));
vi.mock("../db.js", () => ({
  loadEpisode: vi.fn(),
  saveTranscript: vi.fn(),
  setEpisodeStatus: vi.fn(),
}));

const storage = await import("@pod-dex/storage");
const transcription = await import("@pod-dex/transcription");
const db = await import("../db.js");
const { NonRetryableJobError, runTranscription } = await import("./transcribe.js");

const job = { orgId: "org_1", episodeId: "ep_1" };

const episode = {
  id: "ep_1",
  title: "Ep 1",
  audioKey: "orgs/org_1/episodes/ep_1/audio/ep.mp3",
};

const result = {
  provider: "fake",
  model: null,
  language: "en",
  fullText: "hello",
  segments: [{ speaker: "Speaker 0", start: 0, end: 1, text: "hello" }],
  words: [{ word: "hello", start: 0, end: 1, speaker: "Speaker 0" }],
  durationSeconds: 42,
};

beforeEach(() => {
  vi.mocked(db.loadEpisode).mockResolvedValue(episode as never);
  vi.mocked(storage.presignDownload).mockResolvedValue("https://s3.test/signed");
  vi.mocked(transcription.transcribe).mockResolvedValue(result);
});

afterEach(() => vi.clearAllMocks());

describe("runTranscription", () => {
  it("stores the transcript and moves the episode to transcribed", async () => {
    await runTranscription(job);

    expect(db.saveTranscript).toHaveBeenCalledWith("org_1", "ep_1", result);
    expect(vi.mocked(db.setEpisodeStatus).mock.calls.map((c) => c[2])).toEqual([
      "transcribing",
      "transcribed",
    ]);
  });

  it("fetches the audio through a signed url rather than a public one", async () => {
    await runTranscription(job);

    expect(storage.presignDownload).toHaveBeenCalledWith(episode.audioKey, 3600);
    expect(vi.mocked(transcription.transcribe).mock.calls[0]?.[0].audioUrl).toBe(
      "https://s3.test/signed",
    );
  });

  it("records the failure on the episode and rethrows so the queue can retry", async () => {
    vi.mocked(transcription.transcribe).mockRejectedValue(new Error("deepgram exploded"));

    await expect(runTranscription(job)).rejects.toThrow("deepgram exploded");

    expect(vi.mocked(db.setEpisodeStatus).mock.calls.at(-1)).toMatchObject([
      "org_1",
      "ep_1",
      "failed",
      { error: "deepgram exploded" },
    ]);
  });

  it("does not burn retries on an episode that no longer exists", async () => {
    vi.mocked(db.loadEpisode).mockResolvedValue(null);

    await expect(runTranscription(job)).rejects.toBeInstanceOf(NonRetryableJobError);
    expect(transcription.transcribe).not.toHaveBeenCalled();
  });

  it("does not attempt transcription when the episode has no audio", async () => {
    vi.mocked(db.loadEpisode).mockResolvedValue({ ...episode, audioKey: null } as never);

    await expect(runTranscription(job)).rejects.toBeInstanceOf(NonRetryableJobError);
    expect(transcription.transcribe).not.toHaveBeenCalled();
  });
});
