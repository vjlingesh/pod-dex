/**
 * Loads a demo workspace with episodes in every state worth looking at.
 *
 * It drives the running API over HTTP rather than writing rows directly, so the
 * seeded data is produced by the same paths a real user takes — presigned
 * upload, queue, worker, generation. That means `make seed` also doubles as an
 * end-to-end smoke test of the whole pipeline.
 *
 * Requires `make up` to have been run first.
 */
import { loadEnv, optionalEnv } from "@pod-dex/env";
import { deleteObject } from "@pod-dex/storage";
import { FAKE_SCRIPT, FAKE_TIMING } from "@pod-dex/transcription";
import { silentPlaceholder, speechAvailable, synthesiseEpisode } from "./audio.js";

loadEnv();

const API = optionalEnv("API_URL") ?? "http://localhost:8787";
const ORIGIN = optionalEnv("APP_URL") ?? "http://localhost:5173";

const DEMO = {
  name: "Demo Host",
  email: "demo@pod-dex.local",
  password: "demo-password-123",
  workspace: "Demo Podcast",
  slug: "demo-podcast",
};

let cookie = "";

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      ...(cookie ? { cookie } : {}),
      ...init.headers,
    },
  });

  // Better Auth rotates the session cookie on sign-in; carry whatever it sets.
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length > 0) {
    cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  }

  return res;
}

async function json<T>(res: Response, context: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${context} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

async function requireApi(): Promise<void> {
  try {
    const health = await json<{ db: boolean }>(await call("/health"), "health check");
    if (!health.db) throw new Error("the API is up but cannot reach Postgres");
  } catch (err) {
    throw new Error(
      `cannot reach the API at ${API} — run \`make up\` first.\n  ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/** Signs the demo user in, creating the account on first run. */
async function signIn(): Promise<void> {
  const signUp = await call("/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email: DEMO.email, password: DEMO.password, name: DEMO.name }),
  });

  if (signUp.ok) return;

  const signInRes = await call("/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email: DEMO.email, password: DEMO.password }),
  });
  await json(signInRes, "sign in");
}

async function ensureWorkspace(): Promise<void> {
  const me = await json<{ orgId: string | null }>(await call("/me"), "load session");
  if (me.orgId) return;

  const created = await call("/auth/organization/create", {
    method: "POST",
    body: JSON.stringify({ name: DEMO.workspace, slug: DEMO.slug }),
  });

  // A re-run may find the slug taken by this same user; setting it active is enough.
  if (!created.ok && created.status !== 400) {
    throw new Error(`create workspace failed (${created.status})`);
  }

  await json(
    await call("/auth/organization/set-active", {
      method: "POST",
      body: JSON.stringify({ organizationSlug: DEMO.slug }),
    }),
    "activate workspace",
  );
}

type UploadTicket = { episodeId: string; key: string; uploadUrl: string };

async function requestUpload(title: string, bytes: number): Promise<UploadTicket> {
  return json<UploadTicket>(
    await call("/episodes/upload-url", {
      method: "POST",
      body: JSON.stringify({
        title,
        filename: "episode.mp3",
        contentType: "audio/mpeg",
        contentLength: bytes,
      }),
    }),
    `request upload for "${title}"`,
  );
}

async function putAudio(url: string, buffer: Buffer, contentType: string): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) throw new Error(`upload to storage failed (${res.status})`);
}

async function waitForStatus(episodeId: string, target: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { episode } = await json<{ episode: { status: string; error: string | null } }>(
      await call(`/episodes/${episodeId}`),
      "poll episode",
    );

    if (episode.status === target) return;
    if (episode.status === "failed") throw new Error(`episode failed: ${episode.error}`);

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error(`episode ${episodeId} never reached "${target}"`);
}

async function main() {
  await requireApi();
  await signIn();
  await ensureWorkspace();

  const canSpeak = await speechAvailable();
  if (!canSpeak) {
    console.warn(
      "warning: `say` and `ffmpeg` were not both found, so seeded episodes get silent " +
        "placeholder audio. The pipeline still runs — the offline transcriber does not " +
        "listen to the file — but the player will have nothing audible to play.",
    );
  }

  const audio = canSpeak
    ? await synthesiseEpisode(FAKE_SCRIPT, FAKE_TIMING)
    : silentPlaceholder(80);
  console.log(
    `audio rendered: ${(audio.buffer.length / 1024).toFixed(0)} KB, ${audio.duration.toFixed(1)}s`,
  );

  // 1 & 2: complete episodes, taken all the way through the real pipeline.
  for (const title of ["How we scaled onboarding", "What we got wrong about hiring"]) {
    const ticket = await requestUpload(title, audio.buffer.length);
    await putAudio(ticket.uploadUrl, audio.buffer, audio.contentType);
    await json(
      await call(`/episodes/${ticket.episodeId}/upload-complete`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      "complete upload",
    );

    console.log(`  "${title}" uploaded, waiting for the pipeline…`);
    await waitForStatus(ticket.episodeId, "ready");
    console.log(`  "${title}" ready`);
  }

  // 3: a ticket that was issued but never used, so the row sits at `uploading`.
  await requestUpload("Abandoned upload (never finished)", 12345);
  console.log('  "Abandoned upload" left at status uploading');

  // 4: processed, then its audio removed — what every episode looks like after
  // the 30-day lifecycle rule fires. Exercises the player's expired state.
  const expiring = await requestUpload("Old episode (audio expired)", audio.buffer.length);
  await putAudio(expiring.uploadUrl, audio.buffer, audio.contentType);
  await json(
    await call(`/episodes/${expiring.episodeId}/upload-complete`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
    "complete upload",
  );
  await waitForStatus(expiring.episodeId, "ready");
  await deleteObject(expiring.key);
  console.log('  "Old episode" ready with its audio deleted');

  console.log(`
seeded.

  sign in at ${ORIGIN}
  email     ${DEMO.email}
  password  ${DEMO.password}
`);
}

main().catch((err) => {
  console.error(`\nseed failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
