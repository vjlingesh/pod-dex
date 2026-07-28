import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * One macOS voice per speaker, so the two sides of the interview are audibly
 * different and speaker labels in the transcript can be checked by ear.
 */
const VOICES: Record<string, string> = {
  "Speaker 0": "Samantha",
  "Speaker 1": "Daniel",
};

const FALLBACK_VOICE = "Alex";

export async function speechAvailable(): Promise<boolean> {
  try {
    await run("which", ["say"]);
    await run("which", ["ffmpeg"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Renders the script to a real MP3 by speaking each line with its speaker's
 * voice and concatenating the result.
 *
 * The point is that the audio matches the transcript the offline transcriber
 * produces, so playback, chapter seeking and speaker labels can all be checked
 * against something you can actually hear — rather than against noise that
 * happens to be the right number of bytes.
 */
type Timing = { wordsPerSecond: number; gapSeconds: number; leadInSeconds: number };

/** Total seconds of deliberate silence the transcript's timeline assumes. */
function silenceBudget(script: Array<[string, string]>, timing: Timing): number {
  return timing.leadInSeconds + timing.gapSeconds * Math.max(0, script.length - 1);
}

export type Rendered = { buffer: Buffer; contentType: string; duration: number };

async function renderAt(
  script: Array<[string, string]>,
  timing: Timing,
  wordsPerMinute: number,
): Promise<Rendered> {
  const dir = await mkdtemp(join(tmpdir(), "poddex-seed-"));

  try {
    const parts: string[] = [];

    // A silence clip matching the transcript's inter-turn gap, spliced between
    // every pair of turns.
    const silence = join(dir, "gap.aiff");
    await run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=22050:cl=mono:d=${timing.gapSeconds}`,
      silence,
    ]);

    // Lead-in silence, so the first word starts where the transcript says.
    const leadIn = join(dir, "lead-in.aiff");
    await run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=22050:cl=mono:d=${timing.leadInSeconds}`,
      leadIn,
    ]);
    parts.push(leadIn);

    for (const [index, [speaker, line]] of script.entries()) {
      const aiff = join(dir, `${String(index).padStart(3, "0")}.aiff`);
      await run("say", [
        "-v",
        VOICES[speaker] ?? FALLBACK_VOICE,
        // `say` takes words per minute. Driving it from the transcriber's own
        // rate is what keeps the spoken audio lined up with the timestamps, so
        // clicking a chapter lands where the transcript says it should.
        "-r",
        String(Math.round(wordsPerMinute)),
        "-o",
        aiff,
        line,
      ]);

      if (index > 0) parts.push(silence);
      parts.push(aiff);
    }

    // ffmpeg's concat demuxer needs a file list rather than a long argument list.
    const listPath = join(dir, "parts.txt");
    await run("/bin/sh", [
      "-c",
      `printf '%s\\n' ${parts.map((p) => `"file '${p}'"`).join(" ")} > "${listPath}"`,
    ]);

    const mp3 = join(dir, "episode.mp3");
    await run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-codec:a",
      "libmp3lame",
      "-qscale:a",
      "5",
      mp3,
    ]);

    return {
      buffer: await readFile(mp3),
      contentType: "audio/mpeg",
      duration: await probeDuration(mp3),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function probeDuration(path: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    path,
  ]);
  return Number(stdout.trim());
}

/**
 * Renders the script, measuring and correcting the speaking rate until the audio
 * matches the transcript's timeline.
 *
 * `say -r` is only loosely honoured — each voice has its own pacing and inserts
 * pauses at punctuation — and its response to the rate flag is sub-linear, so a
 * single correction undershoots. Asking for the transcript's nominal rate came
 * out 19% short, which pushed the final chapter marker past the end of the file;
 * one correction still left it 11% short. Iterating converges in two or three
 * passes, and a mismatch here is not cosmetic: it is the difference between a
 * chapter click landing on the right sentence and landing past the end.
 */
export async function synthesiseEpisode(
  script: Array<[string, string]>,
  timing: Timing,
): Promise<Rendered> {
  const words = script.reduce((total, [, line]) => total + line.split(/\s+/).length, 0);
  const silence = silenceBudget(script, timing);
  const target = words / timing.wordsPerSecond + silence;

  let rate = timing.wordsPerSecond * 60;
  let best = await renderAt(script, timing, rate);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (Math.abs(best.duration - target) / target <= 0.02) break;

    const next = rate * (best.duration / target);
    // A wild probe result must not send the rate somewhere unusable.
    if (!Number.isFinite(next) || next < 80 || next > 400) break;

    rate = next;
    const candidate = await renderAt(script, timing, rate);
    if (Math.abs(candidate.duration - target) < Math.abs(best.duration - target)) {
      best = candidate;
    }
  }

  return best;
}

/**
 * Used when `say`/`ffmpeg` are unavailable — a silent but structurally valid
 * MP3-ish payload. It will not play meaningfully, so the seeder warns when it
 * falls back to this.
 */
export function silentPlaceholder(seconds: number): Rendered {
  // 32 kbps mono is roughly 4 KB per second; the bytes themselves are inert.
  return {
    buffer: Buffer.alloc(Math.max(1, seconds) * 4000),
    contentType: "audio/mpeg",
    duration: seconds,
  };
}
