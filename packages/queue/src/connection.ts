import { env } from "@pod-dex/env";
import IORedis, { type Redis } from "ioredis";

/** Reads REDIS_URL at call time so tests can point at a different server. */
export function redisUrl(): string {
  return env("REDIS_URL");
}

let connection: Redis | undefined;

/**
 * Shared Redis connection for BullMQ. `maxRetriesPerRequest: null` is required
 * by BullMQ's blocking commands.
 */
export function getConnection(): Redis {
  if (!connection) {
    connection = new IORedis(redisUrl(), { maxRetriesPerRequest: null });
  }
  return connection;
}

export async function closeConnection(): Promise<void> {
  await connection?.quit();
  connection = undefined;
}

export async function checkQueueHealth(): Promise<boolean> {
  try {
    return (await getConnection().ping()) === "PONG";
  } catch {
    return false;
  }
}
