import { randomUUID } from "node:crypto";
import { type Database, getDb, schema } from "@pod-dex/db";
import type { TranscriptResult } from "@pod-dex/transcription";
import { and, eq } from "drizzle-orm";

// Same module-level indirection the API uses, so worker jobs can be tested
// against a fake database.
let dbProvider: () => Database = getDb;

export function db(): Database {
  return dbProvider();
}

export function setDbProvider(provider: () => Database): void {
  dbProvider = provider;
}

export type EpisodeRow = typeof schema.episodes.$inferSelect;

export async function loadEpisode(orgId: string, episodeId: string): Promise<EpisodeRow | null> {
  const [row] = await db()
    .select()
    .from(schema.episodes)
    .where(and(eq(schema.episodes.organizationId, orgId), eq(schema.episodes.id, episodeId)))
    .limit(1);

  return row ?? null;
}

export async function setEpisodeStatus(
  orgId: string,
  episodeId: string,
  status: string,
  patch: Partial<typeof schema.episodes.$inferInsert> = {},
): Promise<void> {
  await db()
    .update(schema.episodes)
    .set({ status, updatedAt: new Date(), ...patch })
    .where(and(eq(schema.episodes.organizationId, orgId), eq(schema.episodes.id, episodeId)));
}

/**
 * Replaces any existing transcript for the episode. Re-running transcription is
 * idempotent rather than additive: an episode has exactly one transcript.
 */
export async function saveTranscript(
  orgId: string,
  episodeId: string,
  result: TranscriptResult,
): Promise<void> {
  await db().transaction(async (tx) => {
    await tx
      .delete(schema.transcripts)
      .where(
        and(
          eq(schema.transcripts.organizationId, orgId),
          eq(schema.transcripts.episodeId, episodeId),
        ),
      );

    await tx.insert(schema.transcripts).values({
      id: randomUUID(),
      organizationId: orgId,
      episodeId,
      provider: result.provider,
      model: result.model,
      language: result.language,
      fullText: result.fullText,
      segments: result.segments,
      words: result.words,
      durationSeconds: result.durationSeconds,
    });
  });
}

export async function loadTranscript(orgId: string, episodeId: string) {
  const [row] = await db()
    .select()
    .from(schema.transcripts)
    .where(
      and(
        eq(schema.transcripts.organizationId, orgId),
        eq(schema.transcripts.episodeId, episodeId),
      ),
    )
    .limit(1);

  return row ?? null;
}
