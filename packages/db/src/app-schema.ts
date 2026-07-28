// Application tables. Every one of them carries `organization_id` and every query
// against them is org-scoped — see AGENTS.md.
import { bigint, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema.js";

/**
 * Episode lifecycle:
 *   uploading  — row exists, audio not yet in storage
 *   pending    — audio confirmed, waiting to be picked up for transcription
 *   transcribing / transcribed
 *   generating / ready
 *   failed     — see `error`
 */
export const episodeStatuses = [
  "uploading",
  "pending",
  "transcribing",
  "transcribed",
  "generating",
  "ready",
  "failed",
] as const;

export type EpisodeStatus = (typeof episodeStatuses)[number];

export const episodes = pgTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Who added it — used to address the processing-done email.
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: text("status").notNull().default("uploading"),
    /** "upload" or "rss". */
    source: text("source").notNull().default("upload"),
    audioKey: text("audio_key"),
    audioContentType: text("audio_content_type"),
    audioBytes: bigint("audio_bytes", { mode: "number" }),
    durationSeconds: bigint("duration_seconds", { mode: "number" }),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("episodes_org_idx").on(table.organizationId),
    index("episodes_org_status_idx").on(table.organizationId, table.status),
  ],
);

/** One diarized utterance: a stretch of speech by a single speaker. */
export type TranscriptSegment = {
  speaker: string;
  start: number;
  end: number;
  text: string;
};

export type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  speaker: string;
};

/**
 * Transcripts outlive the audio they came from — audio expires after 30 days,
 * transcripts are kept indefinitely, and every later output is generated from
 * the transcript rather than the recording.
 */
export const transcripts = pgTable(
  "transcripts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    episodeId: text("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    /** "deepgram" in production, "fake" when running without an API key. */
    provider: text("provider").notNull(),
    model: text("model"),
    language: text("language"),
    fullText: text("full_text").notNull(),
    segments: jsonb("segments").$type<TranscriptSegment[]>().notNull(),
    words: jsonb("words").$type<TranscriptWord[]>().notNull(),
    durationSeconds: bigint("duration_seconds", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("transcripts_org_idx").on(table.organizationId),
    index("transcripts_episode_idx").on(table.episodeId),
  ],
);
