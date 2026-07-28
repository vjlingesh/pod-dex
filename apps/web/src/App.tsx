import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { signOut } from "./auth-client.js";
import { CreateWorkspacePage } from "./pages/CreateWorkspacePage.js";
import { EpisodePage } from "./pages/EpisodePage.js";
import { EpisodesPage } from "./pages/EpisodesPage.js";
import { SignInPage } from "./pages/SignInPage.js";
import { useMe } from "./session.js";

function Shell({ email }: { email: string }) {
  const navigate = useNavigate();

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          pod-dex
        </Link>
        <span className="spacer" />
        <span className="muted small">{email}</span>
        <button
          type="button"
          className="link"
          onClick={() => signOut().then(() => window.location.reload())}
        >
          Sign out
        </button>
      </header>

      <Routes>
        <Route path="/" element={<EpisodesPage onOpen={(id) => navigate(`/episodes/${id}`)} />} />
        <Route path="/episodes/:id" element={<EpisodePage />} />
      </Routes>
    </>
  );
}

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

  return <Shell email={state.me.user.email} />;
}
