import { schema } from "@pod-dex/db";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../deps.js";

export type Output = typeof schema.outputs.$inferSelect;

export async function listOutputs(orgId: string, episodeId: string): Promise<Output[]> {
  return db()
    .select()
    .from(schema.outputs)
    .where(and(eq(schema.outputs.organizationId, orgId), eq(schema.outputs.episodeId, episodeId)))
    .orderBy(asc(schema.outputs.createdAt));
}

export async function setOutputUsed(
  orgId: string,
  outputId: string,
  markedUsed: boolean,
): Promise<Output | null> {
  const [row] = await db()
    .update(schema.outputs)
    .set({ markedUsed, updatedAt: new Date() })
    .where(and(eq(schema.outputs.organizationId, orgId), eq(schema.outputs.id, outputId)))
    .returning();

  return row ?? null;
}

export async function findTranscript(orgId: string, episodeId: string) {
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
