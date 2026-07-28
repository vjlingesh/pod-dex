import { useEffect, useState } from "react";
import { type Health, getHealth } from "../api.js";

type State = { status: "loading" } | { status: "ok"; health: Health } | { status: "error" };

export function HealthPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    getHealth().then(
      (health) => setState({ status: "ok", health }),
      () => setState({ status: "error" }),
    );
  }, []);

  return (
    <main className="page">
      <h1>pod-dex</h1>
      <p className="muted">Turn one interview episode into a week of content.</p>

      <section className="card">
        <h2>System status</h2>
        {state.status === "loading" && <p>Checking…</p>}
        {state.status === "error" && <p role="alert">API unreachable — is it running?</p>}
        {state.status === "ok" && (
          <ul>
            <li>API: reachable</li>
            <li>Database: {state.health.db ? "connected" : "unreachable"}</li>
          </ul>
        )}
      </section>
    </main>
  );
}
