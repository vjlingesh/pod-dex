import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api.js")>();
  return {
    ...actual,
    apiFetch: vi.fn(),
    listEpisodes: vi.fn(),
    getEpisode: vi.fn(),
    listOutputs: vi.fn(),
  };
});

vi.mock("./auth-client.js", () => ({
  authClient: { signUp: { email: vi.fn() } },
  signIn: { email: vi.fn(), social: vi.fn() },
  signOut: vi.fn(),
  organization: { create: vi.fn(), setActive: vi.fn() },
  useSession: vi.fn(),
}));

const api = await import("./api.js");
const { App } = await import("./App.js");

const user = { id: "user_1", email: "host@example.com", name: "Host" };

function signedIn(orgId: string | null) {
  vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
    if (path === "/me") return { user, orgId };
    if (path === "/config") return { googleEnabled: false };
    throw new Error(`unexpected path ${path}`);
  });
}

const renderApp = (route = "/") =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );

afterEach(() => vi.clearAllMocks());

describe("App", () => {
  it("asks an unauthenticated visitor to sign in", async () => {
    vi.mocked(api.apiFetch).mockRejectedValue(new Error("unauthorized"));

    renderApp();

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("sends a signed-in user with no workspace to workspace creation", async () => {
    signedIn(null);

    renderApp();

    expect(await screen.findByText(/create your workspace/i)).toBeInTheDocument();
  });

  it("renders the episodes route for a user with an active workspace", async () => {
    signedIn("org_1");
    vi.mocked(api.listEpisodes).mockResolvedValue([]);

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Episodes" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(user.email)).toBeInTheDocument());
  });

  it("resolves the episode route and passes the id through to the page", async () => {
    signedIn("org_1");
    vi.mocked(api.getEpisode).mockResolvedValue({
      id: "ep_1",
      title: "Ep 1",
      status: "ready",
      source: "upload",
      audioBytes: 1000,
      durationSeconds: 600,
      error: null,
      createdAt: new Date().toISOString(),
    });
    vi.mocked(api.listOutputs).mockResolvedValue([]);

    renderApp("/episodes/ep_1");

    expect(await screen.findByRole("heading", { name: "Ep 1" })).toBeInTheDocument();
    expect(api.getEpisode).toHaveBeenCalledWith("ep_1");
  });
});
