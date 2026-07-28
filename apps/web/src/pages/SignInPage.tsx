import { type FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { authClient, signIn } from "../auth-client.js";

type Mode = "sign-in" | "sign-up";

export function SignInPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    apiFetch<{ googleEnabled: boolean }>("/config")
      .then((cfg) => setGoogleEnabled(cfg.googleEnabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ email, password, name })
        : await signIn.email({ email, password });

    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Sign-in failed");
      return;
    }
    onSignedIn();
  }

  return (
    <main className="page narrow">
      <h1>pod-dex</h1>
      <p className="muted">Sign in to your workspace.</p>

      <section className="card">
        <form onSubmit={submit}>
          {mode === "sign-up" && (
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          )}

          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy}>
            {busy ? "Working…" : mode === "sign-up" ? "Create account" : "Sign in"}
          </button>
        </form>

        {googleEnabled && (
          <button
            type="button"
            className="secondary"
            onClick={() => signIn.social({ provider: "google" })}
          >
            Continue with Google
          </button>
        )}

        <p className="muted small">
          {mode === "sign-in" ? "No account yet? " : "Already have an account? "}
          <button
            type="button"
            className="link"
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          >
            {mode === "sign-in" ? "Create one" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}
