// Application tables. Every one of them carries `organization_id` and every query
// against them is org-scoped — see AGENTS.md.
import { bigint, boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
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

/**
 * Content formats produced from a transcript. Show notes ship first (issue #8);
 * the rest arrive in #10.
 */
export const outputKinds = [
  "show_notes",
  "linkedin_posts",
  "newsletter_blurb",
  "blog_post",
] as const;

export type OutputKind = (typeof outputKinds)[number];

/** A timestamped chapter within an episode, rendered as part of the show notes. */
export type Chapter = {
  /** Seconds from the start of the episode. */
  start: number;
  /** Same instant as MM:SS, precomputed so the UI never has to reformat. */
  label: string;
  title: string;
};

export type OutputBody = {
  /** Markdown, ready to copy. */
  markdown: string;
  chapters?: Chapter[];
  /** LinkedIn posts and case-study angles arrive as a list rather than one blob. */
  items?: string[];
};

export const outputs = pgTable(
  "outputs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    episodeId: text("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: jsonb("body").$type<OutputBody>().notNull(),
    /** Which model produced it, so a regeneration is attributable. */
    generatedBy: text("generated_by"),
    markedUsed: boolean("marked_used").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("outputs_org_idx").on(table.organizationId),
    index("outputs_episode_idx").on(table.episodeId),
  ],
);
