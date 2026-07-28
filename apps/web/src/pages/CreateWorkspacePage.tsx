import { type FormEvent, useState } from "react";
import { organization } from "../auth-client.js";

/** Slug the organization plugin requires; derived so the user only types a name. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function CreateWorkspacePage({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const slug = toSlug(name);
    const created = await organization.create({ name, slug });

    if (created.error) {
      setBusy(false);
      setError(created.error.message ?? "Could not create workspace");
      return;
    }

    // Creating a workspace does not make it active — the session still points at
    // whatever it pointed at before, so set it explicitly before continuing.
    await organization.setActive({ organizationSlug: slug });
    setBusy(false);
    onCreated();
  }

  return (
    <main className="page narrow">
      <h1>Create your workspace</h1>
      <p className="muted">Episodes, outputs and billing all belong to a workspace.</p>

      <section className="card">
        <form onSubmit={submit}>
          <label>
            Workspace name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Podcast"
              required
            />
          </label>

          {name && <p className="muted small">URL: /{toSlug(name)}</p>}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || !toSlug(name)}>
            {busy ? "Creating…" : "Create workspace"}
          </button>
        </form>
      </section>
    </main>
  );
}
