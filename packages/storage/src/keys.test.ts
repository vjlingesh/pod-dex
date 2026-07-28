import { describe, expect, it } from "vitest";
import { audioKey, keyBelongsToOrg } from "./keys.js";

describe("audioKey", () => {
  it("namespaces every object under the owning org", () => {
    expect(audioKey("org_1", "ep_1", "episode.mp3")).toBe(
      "orgs/org_1/episodes/ep_1/audio/episode.mp3",
    );
  });

  it("strips path separators out of the filename so a key cannot escape its prefix", () => {
    const key = audioKey("org_1", "ep_1", "../../other-org/secret.mp3");

    expect(key.startsWith("orgs/org_1/episodes/ep_1/audio/")).toBe(true);
    expect(key).not.toContain("..");
  });

  it("falls back to a placeholder when the filename has nothing usable", () => {
    expect(audioKey("org_1", "ep_1", "///")).toBe("orgs/org_1/episodes/ep_1/audio/file");
  });
});

describe("keyBelongsToOrg", () => {
  it("accepts a key under the org prefix", () => {
    expect(keyBelongsToOrg("orgs/org_1/episodes/ep_1/audio/a.mp3", "org_1")).toBe(true);
  });

  it("rejects another org's key, including one that merely shares a prefix", () => {
    expect(keyBelongsToOrg("orgs/org_2/episodes/ep_1/audio/a.mp3", "org_1")).toBe(false);
    expect(keyBelongsToOrg("orgs/org_10/episodes/ep_1/audio/a.mp3", "org_1")).toBe(false);
  });
});
