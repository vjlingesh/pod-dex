/**
 * Characters that survive into an object key; everything else collapses to "-".
 * Runs of dots are collapsed and leading dots dropped, so no key can contain a
 * ".." segment that a normalising client might resolve upward out of its prefix.
 */
function slugSegment(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/\.{2,}/g, ".")
      .replace(/^[.-]+|[.-]+$/g, "")
      .slice(0, 80) || "file"
  );
}

/**
 * Every object key starts with `orgs/<orgId>/`, which is what makes tenant
 * isolation enforceable at the storage layer: a presigned URL for one org can
 * never name another org's prefix, and the 30-day audio lifecycle rule is scoped
 * to this prefix.
 */
export function audioKey(orgId: string, episodeId: string, filename: string): string {
  return `orgs/${orgId}/episodes/${episodeId}/audio/${slugSegment(filename)}`;
}

export function quoteCardKey(
  orgId: string,
  episodeId: string,
  highlightId: string,
  variant: string,
) {
  return `orgs/${orgId}/episodes/${episodeId}/cards/${highlightId}-${slugSegment(variant)}.png`;
}

/** True when the key belongs to the given org. Guards every download path. */
export function keyBelongsToOrg(key: string, orgId: string): boolean {
  return key.startsWith(`orgs/${orgId}/`);
}
