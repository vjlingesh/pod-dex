import { signOut } from "./auth-client.js";
import { CreateWorkspacePage } from "./pages/CreateWorkspacePage.js";
import { HealthPage } from "./pages/HealthPage.js";
import { SignInPage } from "./pages/SignInPage.js";
import { useMe } from "./session.js";

export function App() {
  const { state, refresh } = useMe();

  if (state.status === "loading") {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (state.status === "signed-out") return <SignInPage onSignedIn={refresh} />;

  if (!state.me.orgId) return <CreateWorkspacePage onCreated={refresh} />;

  return (
    <>
      <header className="topbar">
        <span className="muted small">{state.me.user.email}</span>
        <button
          type="button"
          className="link"
          onClick={() => signOut().then(() => window.location.reload())}
        >
          Sign out
        </button>
      </header>
      <HealthPage />
    </>
  );
}
