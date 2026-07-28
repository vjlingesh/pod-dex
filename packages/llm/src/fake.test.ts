import { describe, expect, it } from "vitest";
import { completeWithFake } from "./fake.js";

const ask = (task: string, content: string) =>
  completeWithFake({ tier: "fast", task, messages: [{ role: "user", content }] });

describe("the offline fake", () => {
  it("returns one chapter title per chapter in the prompt", async () => {
    const prompt = [
      "Episode: Ep 1",
      "",
      "Chapters:",
      "",
      "1. Welcome back to the show. Today we talk about shipping.",
      "",
      "2. Onboarding broke first. Nobody noticed for a quarter.",
      "",
      "3. We wrote things down and the ramp halved.",
    ].join("\n");

    const titles = (await ask("chapter-titles", prompt)).split("\n").filter(Boolean);

    expect(titles).toHaveLength(3);
    // Titles must come from the chapter text, not from the prompt's framing.
    expect(titles[0]).toContain("Welcome back to the show");
    expect(titles.join("\n")).not.toContain("Episode:");
    expect(titles.join("\n")).not.toContain("offline draft");
  });

  it("keeps titles short", async () => {
    const prompt = `1. ${"word ".repeat(40)}`;

    const title = (await ask("chapter-titles", prompt)).replace(/^\d+\.\s*/, "");

    expect(title.split(/\s+/).length).toBeLessThanOrEqual(7);
  });

  it("returns canned prose for tasks whose shape does not depend on the input", async () => {
    expect(await ask("show-notes-intro", "anything")).not.toContain("offline draft");
  });

  it("marks unknown tasks as synthetic rather than pretending to answer", async () => {
    expect(await ask("no-such-task", "anything")).toContain("offline draft");
  });
});
