import { schema } from "@pod-dex/db";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../deps.js";

export type Episode = typeof schema.episodes.$inferSelect;

/**
 * Every function here takes `orgId` first and folds it into the WHERE clause.
 * There is deliberately no "find by id" that skips the org — that is the one
 * shortcut that would break tenant isolation.
 */
export async function createEpisode(input: {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  source?: string;
  audioKey: string;
  audioContentType: string;
}): Promise<Episode> {
  const [row] = await db()
    .insert(schema.episodes)
    .values({
      id: input.id,
      organizationId: input.orgId,
      createdByUserId: input.userId,
      title: input.title,
      source: input.source ?? "upload",
      status: "uploading",
      audioKey: input.audioKey,
      audioContentType: input.audioContentType,
    })
    .returning();

  if (!row) throw new Error("failed to create episode");
  return row;
}

export async function findEpisode(orgId: string, id: string): Promise<Episode | null> {
  const [row] = await db()
    .select()
    .from(schema.episodes)
    .where(and(eq(schema.episodes.organizationId, orgId), eq(schema.episodes.id, id)))
    .limit(1);

  return row ?? null;
}

export async function listEpisodes(orgId: string): Promise<Episode[]> {
  return db()
    .select()
    .from(schema.episodes)
    .where(eq(schema.episodes.organizationId, orgId))
    .orderBy(desc(schema.episodes.createdAt));
}

export async function updateEpisode(
  orgId: string,
  id: string,
  patch: Partial<typeof schema.episodes.$inferInsert>,
): Promise<Episode | null> {
  const [row] = await db()
    .update(schema.episodes)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.episodes.organizationId, orgId), eq(schema.episodes.id, id)))
    .returning();

  return row ?? null;
}
